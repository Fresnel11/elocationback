import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PriceAlertsService } from '../price-alerts/price-alerts.service';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { Ad } from './entities/ad.entity';
import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { SearchAdsDto } from './dto/search-ads.dto';
import { Review, ReviewStatus } from '../reviews/entities/review.entity';
import {
  DemarcheurProfile,
  DemarcheurStatus,
} from '../demarcheurs/entities/demarcheur-profile.entity';

import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { AdPublisherRole } from '../common/enums/ad-publisher-role.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { LocationService } from '../services/locationService';
import { CacheService } from '../cache/cache.service';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { ABTestingService } from '../ab-testing/ab-testing.service';

/** Annonce enrichie de sa note agrégée, calculée à la volée pour la liste. */
type AdWithRating = Ad & {
  averageRating: number;
  reviewsCount: number;
  /** L'auteur de l'annonce est un démarcheur approuvé. */
  isDemarcheur: boolean;
};


@Injectable()
export class AdsService {
  constructor(
    @InjectRepository(Ad)
    private readonly adRepository: Repository<Ad>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly priceAlertsService: PriceAlertsService,
    private readonly notificationsService: NotificationsService,
    private readonly cacheService: CacheService,
    private readonly recommendationsService: RecommendationsService,
    private readonly abTestingService: ABTestingService,
    @InjectRepository(DemarcheurProfile)
    private readonly demarcheurRepository: Repository<DemarcheurProfile>,
  ) {}

  async create(createAdDto: CreateAdDto, user: User): Promise<Ad> {
    if (!user.isVerified) {
      throw new ForbiddenException('Vous devez vérifier votre identité pour publier une annonce');
    }

    await this.assertMandateIsValid(createAdDto, user.id);

    const whatsappLink = createAdDto.whatsappNumber
      ? `https://wa.me/${createAdDto.whatsappNumber.replace(/\D/g, '')}`
      : undefined;

    const isMandate = createAdDto.publisherRole === AdPublisherRole.MIDDLEMAN;

    const ad = this.adRepository.create({
      ...createAdDto,
      whatsappLink,
      userId: user.id,
      // Les coordonnées du mandant n'ont de sens que sur une annonce mandatée :
      // on les efface si le rôle n'est pas celui d'un démarcheur.
      ownerName: isMandate ? createAdDto.ownerName : null,
      ownerPhone: isMandate ? createAdDto.ownerPhone : null,
      ownerConsent: isMandate ? true : false,
    } as Partial<Ad>);

    const savedAd = await this.adRepository.save(ad);
    
    // Invalider le cache après création
    await this.invalidateAdsCache();
    
    // Vérifier les alertes de recherche après création
    this.checkSearchAlerts(savedAd).catch(err => 
      console.error('Erreur vérification alertes:', err)
    );
    
    return savedAd;
  }

  async findAll(searchAdsDto: SearchAdsDto, userCity?: string, userId?: string) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      minPrice,
      maxPrice,
      location,
      isAvailable,
      bedrooms,
      bathrooms,
      amenities,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      userLatitude,
      userLongitude,
      radius = 50,
    } = searchAdsDto;

    // Génération de la clé de cache.
    // Tout filtre absent d'ici renverrait le résultat d'une AUTRE recherche.
    const cacheKey = this.cacheService.generateCacheKey('ads', {
      page, limit, search, categoryId, minPrice, maxPrice, location,
      isAvailable, bedrooms, bathrooms, amenities: amenities?.join(','),
      sortBy, sortOrder, userCity, userLatitude, userLongitude, radius
    });

    // Vérifier le cache
    const cachedResult = await this.cacheService.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const skip = (page - 1) * limit;
    
    let queryBuilder: SelectQueryBuilder<Ad> = this.adRepository
      .createQueryBuilder('ad')
      .leftJoinAndSelect('ad.user', 'user')
      .leftJoinAndSelect('ad.category', 'category')
      .leftJoinAndSelect('ad.subCategory', 'subCategory')
      .where('ad.isActive = :isActive AND ad.isAvailable = :isAvailable', { 
        isActive: true, 
        isAvailable: true 
      });

    // LIKE et non ILIKE : ILIKE est propre à PostgreSQL et lève une erreur de
    // syntaxe sous MySQL. La collation utf8mb4_unicode_ci rend déjà LIKE
    // insensible à la casse.
    if (search) {
      queryBuilder.andWhere(
        '(ad.title LIKE :search OR ad.description LIKE :search OR ad.location LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (categoryId) {
      queryBuilder.andWhere('ad.categoryId = :categoryId', { categoryId });
    }

    if (minPrice !== undefined) {
      queryBuilder.andWhere('ad.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere('ad.price <= :maxPrice', { maxPrice });
    }

    if (location) {
      queryBuilder.andWhere('ad.location LIKE :location', { location: `%${location}%` });
    }

    if (isAvailable !== undefined) {
      queryBuilder.andWhere('ad.isAvailable = :isAvailable', { isAvailable });
    }

    // Chambres et salles de bain : seuils minimums, pas des égalités.
    if (bedrooms !== undefined) {
      queryBuilder.andWhere('ad.bedrooms >= :bedrooms', { bedrooms });
    }

    if (bathrooms !== undefined) {
      queryBuilder.andWhere('ad.bathrooms >= :bathrooms', { bathrooms });
    }

    // amenities est une colonne JSON : JSON_CONTAINS exige que l'annonce
    // propose TOUS les équipements demandés (ET, pas OU).
    if (amenities?.length) {
      amenities.forEach((amenity, index) => {
        queryBuilder.andWhere(
          `JSON_CONTAINS(ad.amenities, :amenity${index}, '$')`,
          { [`amenity${index}`]: JSON.stringify(amenity) },
        );
      });
    }

    // A/B Testing pour l'algorithme de tri
    let algorithmConfig = null;
    if (userId) {
      const abTest = await this.abTestingService.getAlgorithmForUser(userId);
      if (abTest) {
        algorithmConfig = abTest;
      }
    }

    // Appliquer l'algorithme selon le test A/B
    if (algorithmConfig?.algorithm === 'B') {
      // Algorithme B : Tri par popularité + géographie
      queryBuilder.addSelect('(ad.views * 0.7 + COALESCE(ad.averageRating, 0) * 0.3)', 'popularity_score');
      queryBuilder.orderBy('popularity_score', 'DESC');
    } else {
      // Algorithme A : Tri géographique standard
      if (userCity && !location) {
        const nearbyCities = LocationService.getNearbyCities(userCity);
        
        // LIKE et non ILIKE (PostgreSQL), et paramètres liés plutôt
        // qu'interpolés : userCity vient de la requête HTTP.
        const nearbyConditions = nearbyCities
          .map((_, i) => `WHEN ad.location LIKE :nearby${i} THEN 2`)
          .join(' ');

        queryBuilder.addSelect(
          `CASE
            WHEN ad.location LIKE :userCity THEN 1
            ${nearbyConditions}
            ELSE 3
          END`,
          'location_priority',
        );
        queryBuilder.setParameter('userCity', `%${userCity}%`);
        nearbyCities.forEach((city, i) =>
          queryBuilder.setParameter(`nearby${i}`, `%${city}%`),
        );
        
        queryBuilder.orderBy('location_priority', 'ASC');
      }
    }

    const validSortFields = ['createdAt', 'price', 'title'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    
    queryBuilder.addOrderBy(`ad.${sortField}` as any, sortOrder as any);
    
    queryBuilder.skip(skip).take(limit);

    const [ads, total] = await queryBuilder.getManyAndCount();

    console.log(`[AdsService] Récupération: ${ads.length} annonces sur ${total} total`);
    console.log(`[AdsService] Première annonce:`, ads[0] ? {
      id: ads[0].id,
      title: ads[0].title,
      photos: ads[0].photos,
      isActive: ads[0].isActive,
      isAvailable: ads[0].isAvailable
    } : 'Aucune annonce');

    const result = {
      ads: await this.withRatings(ads),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    // Mettre en cache le résultat (TTL plus court pour les recherches)
    const ttl = search || location ? 5 * 60 * 1000 : 15 * 60 * 1000; // 5min si recherche, 15min sinon
    await this.cacheService.set(cacheKey, result, ttl);

    return result;
  }

  /**
   * Contrôle qu'une publication « pour le compte d'un propriétaire » est
   * légitime.
   *
   * Sans ce contrôle, publisherRole ne serait qu'une déclaration : n'importe
   * qui pourrait se présenter comme démarcheur sur ses annonces, ce qui viderait
   * le badge de son sens.
   */
  private async assertMandateIsValid(dto: CreateAdDto, userId: string): Promise<void> {
    if (dto.publisherRole !== AdPublisherRole.MIDDLEMAN) return;

    const approved = await this.demarcheurRepository.count({
      where: { userId, status: DemarcheurStatus.APPROVED },
    });
    if (!approved) {
      throw new ForbiddenException(
        "Seul un démarcheur vérifié peut publier pour le compte d'un propriétaire",
      );
    }

    if (!dto.ownerName || !dto.ownerPhone) {
      throw new BadRequestException(
        'Indiquez le nom et le téléphone du propriétaire mandant',
      );
    }

    if (!dto.ownerConsent) {
      throw new BadRequestException(
        "Vous devez attester avoir l'accord du propriétaire",
      );
    }
  }

  /**
   * Enrichit une page d'annonces : note moyenne, nombre d'avis, et statut de
   * démarcheur de l'auteur.
   *
   * Deux requêtes agrégées pour toute la page, quel que soit son volume. Le
   * front appelait auparavant /reviews/ad/:id/rating pour chaque annonce, soit
   * 12 requêtes HTTP supplémentaires par page — coûteux en données mobiles.
   *
   * Le statut de démarcheur est lu à chaque affichage plutôt que recopié sur
   * l'annonce : une suspension retire le badge immédiatement, partout.
   */
  private async withRatings(ads: Ad[]): Promise<AdWithRating[]> {
    if (!ads.length) return [];

    const rows = await this.reviewRepository
      .createQueryBuilder('review')
      .leftJoin('review.ad', 'ad')
      .select('ad.id', 'adId')
      .addSelect('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'total')
      .where('ad.id IN (:...ids)', { ids: ads.map((ad) => ad.id) })
      .andWhere('review.status = :status', { status: ReviewStatus.APPROVED })
      .groupBy('ad.id')
      .getRawMany<{ adId: string; average: string; total: string }>();

    const byAdId = new Map(rows.map((row) => [row.adId, row]));

    const demarcheurs = await this.demarcheurRepository.find({
      where: {
        userId: In([...new Set(ads.map((ad) => ad.userId))]),
        status: DemarcheurStatus.APPROVED,
      },
      select: ['userId'],
    });
    const demarcheurIds = new Set(demarcheurs.map((d) => d.userId));

    return ads.map((ad) => {
      const row = byAdId.get(ad.id);
      return Object.assign(ad, {
        averageRating: row ? Math.round(Number(row.average) * 10) / 10 : 0,
        reviewsCount: row ? Number(row.total) : 0,
        isDemarcheur: demarcheurIds.has(ad.userId),
      });
    });
  }

  async findOne(id: string, userId?: string): Promise<Ad> {
    const ad = await this.adRepository.findOne({
      where: { id },
      relations: ['user', 'category', 'subCategory'],
    });

    if (!ad) {
      throw new NotFoundException('Ad not found');
    }

    // Incrémenter les vues
    await this.adRepository.update(id, { views: () => 'views + 1' });

    // Tracker la vue pour les recommandations
    if (userId) {
      await this.recommendationsService.trackUserAction(userId, 'view', {
        adId: id,
        categoryId: ad.categoryId,
        location: ad.location,
        priceRange: [ad.price * 0.8, ad.price * 1.2]
      });
    }

    return ad;
  }

  async findUserAds(userId: string, searchAdsDto: SearchAdsDto) {
    const { page = 1, limit = 10 } = searchAdsDto;
    const skip = (page - 1) * limit;

    const [ads, total] = await this.adRepository.findAndCount({
      where: { 
        userId,
        isActive: true,
        isAvailable: true
      },
      relations: ['category', 'subCategory', 'user'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      ads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, updateAdDto: UpdateAdDto, user: User): Promise<Ad> {
    const ad = await this.findOne(id);

    if (ad.userId !== user.id && user.role.name !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own ads');
    }

    const previousPrice = ad.price;
    const whatsappLink = updateAdDto.whatsappNumber
      ? `https://wa.me/${updateAdDto.whatsappNumber.replace(/\D/g, '')}`
      : ad.whatsappLink;

    Object.assign(ad, { ...updateAdDto, whatsappLink });
    const updatedAd = await this.adRepository.save(ad);
    
    if (updateAdDto.price && updateAdDto.price !== previousPrice) {
      await this.priceAlertsService.checkPriceChanges(id, updateAdDto.price, previousPrice);
    }
    
    return updatedAd;
  }

  async remove(id: string, user: User): Promise<void> {
    const ad = await this.findOne(id);

    if (ad.userId !== user.id && user.role.name !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own ads');
    }

    await this.adRepository.remove(ad);
  }

  async toggleAdStatus(id: string, user: User): Promise<Ad> {
    const ad = await this.findOne(id);

    if (ad.userId !== user.id && user.role.name !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only toggle your own ads');
    }

    ad.isActive = !ad.isActive;
    return this.adRepository.save(ad);
  }

  async redirectToWhatsapp(id: string): Promise<{ whatsappLink: string }> {
    const ad = await this.findOne(id);

    if (!ad.whatsappLink) {
      throw new BadRequestException('WhatsApp contact not available for this ad');
    }

    return { whatsappLink: ad.whatsappLink };
  }

  async uploadPhotos(id: string, photos: string[], user: User): Promise<Ad> {
    const ad = await this.findOne(id);

    if (ad.userId !== user.id && user.role.name !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update photos for your own ads');
    }

    if (photos.length > 5) {
      throw new BadRequestException('Maximum 5 photos allowed');
    }

    ad.photos = photos;
    return this.adRepository.save(ad);
  }

  private async checkSearchAlerts(ad: Ad): Promise<void> {
    // Cette méthode sera appelée par le service cron
    // Pas besoin d'implémentation ici car gérée par NotificationCronService
  }

  private async invalidateAdsCache(): Promise<void> {
    // Invalider tous les caches d'annonces (pattern matching simple)
    // Dans une vraie implémentation Redis, on utiliserait SCAN avec pattern
    // Ici on clear tout le cache pour simplifier
    // await this.cacheService.clear();
  }

  async debugCount(): Promise<number> {
    const count = await this.adRepository.count();
    console.log(`[AdsService] Total annonces en base: ${count}`);
    return count;
  }
}