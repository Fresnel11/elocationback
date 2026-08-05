import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DemarcheurProfile, DemarcheurStatus } from './entities/demarcheur-profile.entity';
import { User } from '../users/entities/user.entity';
import { Ad } from '../ads/entities/ad.entity';
import { ApplyDemarcheurDto } from './dto/apply-demarcheur.dto';
import { ReviewDemarcheurDto } from './dto/review-demarcheur.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { UsersService } from '../users/users.service';
import {
  DocumentType,
  UserVerification,
  VerificationStatus,
} from '../users/entities/user-verification.entity';

@Injectable()
export class DemarcheursService {
  constructor(
    @InjectRepository(DemarcheurProfile)
    private readonly profileRepository: Repository<DemarcheurProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Ad)
    private readonly adRepository: Repository<Ad>,
    @InjectRepository(UserVerification)
    private readonly verificationRepository: Repository<UserVerification>,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Dépose ou remplace une candidature.
   *
   * L'identité doit être établie — le badge « démarcheur vérifié » ne vaut rien
   * si la personne derrière ne l'est pas — mais elle est fournie DANS la
   * candidature plutôt qu'avant. Sans cela le candidat enchaînait deux
   * validations successives de 24 à 48 h.
   */
  async apply(userId: string, dto: ApplyDemarcheurDto): Promise<DemarcheurProfile> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    if (!user.isVerified) {
      await this.submitIdentity(userId, dto);
    }

    const existing = await this.profileRepository.findOne({ where: { userId } });

    if (existing) {
      if (existing.status === DemarcheurStatus.APPROVED) {
        throw new BadRequestException('Vous êtes déjà démarcheur');
      }
      if (existing.status === DemarcheurStatus.PENDING) {
        throw new BadRequestException('Votre candidature est déjà en cours d\'examen');
      }
      if (existing.status === DemarcheurStatus.SUSPENDED) {
        throw new ForbiddenException(
          'Votre statut a été suspendu. Contactez le support pour en discuter.',
        );
      }

      // Refusée : on autorise une nouvelle tentative sur le même profil.
      Object.assign(existing, {
        ...dto,
        status: DemarcheurStatus.PENDING,
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
      });
      return this.profileRepository.save(existing);
    }

    const profile = this.profileRepository.create({
      userId,
      zones: dto.zones,
      experienceYears: dto.experienceYears,
      motivation: dto.motivation,
      bio: dto.bio ?? null,
      status: DemarcheurStatus.PENDING,
    });

    return this.profileRepository.save(profile);
  }

  /**
   * Enregistre la pièce d'identité jointe à la candidature.
   *
   * Le verso n'est exigé que pour une CNI : un passeport n'a qu'une page
   * d'identité. Le selfie permet de rapprocher la personne du document, sans
   * quoi une pièce empruntée suffirait à se faire vérifier.
   */
  private async submitIdentity(userId: string, dto: ApplyDemarcheurDto): Promise<void> {
    const pending = await this.verificationRepository.findOne({
      where: { userId, status: VerificationStatus.PENDING },
    });
    // Un dossier d'identité est déjà en cours : inutile d'en réclamer un second.
    if (pending) return;

    if (!dto.documentType || !dto.documentFrontPhoto || !dto.selfiePhoto) {
      throw new BadRequestException(
        "Joignez une pièce d'identité et une photo de votre visage",
      );
    }

    if (dto.documentType === DocumentType.CNI && !dto.documentBackPhoto) {
      throw new BadRequestException('Le verso de la CNI est requis');
    }

    await this.usersService.submitVerification(userId, {
      selfiePhoto: dto.selfiePhoto,
      documentType: dto.documentType,
      documentFrontPhoto: dto.documentFrontPhoto,
      documentBackPhoto:
        dto.documentType === DocumentType.CNI ? dto.documentBackPhoto : undefined,
    });
  }

  /** Candidature de l'utilisateur courant, ou null s'il n'a jamais candidaté. */
  async findMine(userId: string): Promise<DemarcheurProfile | null> {
    return this.profileRepository.findOne({ where: { userId } });
  }

  /** Vrai si l'utilisateur est un démarcheur en règle. */
  async isApproved(userId: string): Promise<boolean> {
    const count = await this.profileRepository.count({
      where: { userId, status: DemarcheurStatus.APPROVED },
    });
    return count > 0;
  }

  /** Annuaire public : uniquement les démarcheurs approuvés. */
  async findPublic(zone?: string) {
    const profiles = await this.profileRepository.find({
      where: { status: DemarcheurStatus.APPROVED },
      relations: ['user'],
      order: { approvedAt: 'DESC' },
    });

    const filtered = zone
      ? profiles.filter((p) =>
          p.zones.some((z) => z.toLowerCase().includes(zone.toLowerCase())),
        )
      : profiles;

    return Promise.all(filtered.map((profile) => this.toPublic(profile)));
  }

  async findPublicOne(userId: string) {
    const profile = await this.profileRepository.findOne({
      where: { userId, status: DemarcheurStatus.APPROVED },
      relations: ['user'],
    });
    if (!profile) throw new NotFoundException('Démarcheur introuvable');
    return this.toPublic(profile);
  }

  /**
   * Vue publique : ne renvoie ni la motivation ni les motifs de refus, qui
   * relèvent du dossier interne.
   */
  private async toPublic(profile: DemarcheurProfile) {
    const adsCount = await this.adRepository.count({
      where: { userId: profile.userId, isActive: true },
    });

    return {
      userId: profile.userId,
      firstName: profile.user?.firstName,
      lastName: profile.user?.lastName,
      profilePicture: profile.user?.profilePicture,
      zones: profile.zones,
      experienceYears: profile.experienceYears,
      bio: profile.bio,
      adsCount,
      demarcheurSince: profile.approvedAt,
    };
  }

  // ----------------------------- Administration -----------------------------

  /**
   * Dossiers pour l'administration.
   *
   * La forme de la réponse est construite explicitement plutôt que de renvoyer
   * l'entité User : celle-ci porte le mot de passe haché, que le décorateur
   * @Exclude ne masque QUE si un ClassSerializerInterceptor est monté. Ne rien
   * exposer par construction vaut mieux que dépendre d'un décorateur.
   */
  async findApplications(status?: DemarcheurStatus) {
    const profiles = await this.profileRepository.find({
      where: status ? { status } : { status: In(Object.values(DemarcheurStatus)) },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return profiles.map((profile) => ({
      id: profile.id,
      userId: profile.userId,
      zones: profile.zones,
      experienceYears: profile.experienceYears,
      motivation: profile.motivation,
      bio: profile.bio,
      status: profile.status,
      rejectionReason: profile.rejectionReason,
      createdAt: profile.createdAt,
      reviewedAt: profile.reviewedAt,
      approvedAt: profile.approvedAt,
      candidate: {
        firstName: profile.user?.firstName,
        lastName: profile.user?.lastName,
        email: profile.user?.email,
        phone: profile.user?.phone,
        profilePicture: profile.user?.profilePicture,
        // Permet de refuser d'approuver un démarcheur dont l'identité
        // n'a pas encore été validée.
        isVerified: profile.user?.isVerified ?? false,
      },
    }));
  }

  async review(id: string, adminId: string, dto: ReviewDemarcheurDto) {
    const profile = await this.profileRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!profile) throw new NotFoundException('Candidature introuvable');

    const needsReason =
      dto.status === DemarcheurStatus.REJECTED || dto.status === DemarcheurStatus.SUSPENDED;
    if (needsReason && !dto.reason) {
      throw new BadRequestException('Un motif est requis pour refuser ou suspendre');
    }

    profile.status = dto.status;
    profile.rejectionReason = needsReason ? dto.reason! : null;
    profile.reviewedBy = adminId;
    profile.reviewedAt = new Date();
    if (dto.status === DemarcheurStatus.APPROVED && !profile.approvedAt) {
      profile.approvedAt = new Date();
    }

    const saved = await this.profileRepository.save(profile);

    // L'échec d'une notification ne doit pas annuler une décision déjà prise.
    try {
      const messages: Partial<
        Record<DemarcheurStatus, { type: NotificationType; title: string; message: string }>
      > = {
        [DemarcheurStatus.APPROVED]: {
          type: NotificationType.DEMARCHEUR_APPROVED,
          title: 'Vous êtes désormais démarcheur',
          message:
            'Votre candidature a été acceptée. Vos annonces porteront le badge Démarcheur vérifié.',
        },
        [DemarcheurStatus.REJECTED]: {
          type: NotificationType.DEMARCHEUR_REJECTED,
          title: 'Candidature de démarcheur refusée',
          message: dto.reason ?? 'Votre candidature n\'a pas été retenue.',
        },
        [DemarcheurStatus.SUSPENDED]: {
          type: NotificationType.DEMARCHEUR_SUSPENDED,
          title: 'Statut de démarcheur suspendu',
          message: dto.reason ?? 'Votre badge a été retiré.',
        },
      };

      const payload = messages[dto.status];
      if (payload) {
        await this.notificationsService.create({
          userId: profile.userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
        });
      }
    } catch (error) {
      console.error('Notification démarcheur non envoyée :', (error as Error).message);
    }

    return saved;
  }
}
