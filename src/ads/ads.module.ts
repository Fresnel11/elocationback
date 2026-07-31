import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdsService } from './ads.service';
import { AdsController } from './ads.controller';
import { Ad } from './entities/ad.entity';
import { Review } from '../reviews/entities/review.entity';
import { PriceAlertsModule } from '../price-alerts/price-alerts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CacheModule } from '../cache/cache.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { ABTestingModule } from '../ab-testing/ab-testing.module';

@Module({
  imports: [
    // Review : permet d'agréger les notes de toute une page d'annonces en une
    // seule requête, au lieu d'un appel HTTP par annonce côté client.
    TypeOrmModule.forFeature([Ad, Review]),
    PriceAlertsModule,
    forwardRef(() => NotificationsModule),
    CacheModule,
    forwardRef(() => RecommendationsModule),
    forwardRef(() => ABTestingModule)
  ],
  controllers: [AdsController],
  providers: [AdsService],
  exports: [AdsService],
})
export class AdsModule {}