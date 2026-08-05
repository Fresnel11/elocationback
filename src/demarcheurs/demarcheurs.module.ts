import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemarcheursService } from './demarcheurs.service';
import { DemarcheursController } from './demarcheurs.controller';
import { DemarcheurProfile } from './entities/demarcheur-profile.entity';
import { User } from '../users/entities/user.entity';
import { Ad } from '../ads/entities/ad.entity';
import { UserVerification } from '../users/entities/user-verification.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    // User : contrôle du prérequis de vérification d'identité.
    // Ad    : comptage des annonces affichées sur le profil public.
    TypeOrmModule.forFeature([DemarcheurProfile, User, Ad, UserVerification]),
    forwardRef(() => NotificationsModule),
    // UsersModule : réutilise submitVerification plutôt que de dupliquer
    // l'enregistrement d'une pièce d'identité.
    forwardRef(() => UsersModule),
  ],
  controllers: [DemarcheursController],
  providers: [DemarcheursService],
  exports: [DemarcheursService],
})
export class DemarcheursModule {}
