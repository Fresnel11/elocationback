import {
  ExecutionContext,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // La stratégie n'est enregistrée que si les identifiants sont configurés
    // (voir AuthModule) : sans eux, passport ne connaît pas 'google'.
    if (
      !this.configService.get<string>('GOOGLE_CLIENT_ID') ||
      !this.configService.get<string>('GOOGLE_CLIENT_SECRET')
    ) {
      throw new NotImplementedException(
        "La connexion Google n'est pas configurée sur ce serveur",
      );
    }

    return super.canActivate(context);
  }
}
