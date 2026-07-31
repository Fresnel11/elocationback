import { Controller, Post, Body, UseGuards, Get, Request, UseInterceptors, ClassSerializerInterceptor, Res } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse
} from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Response } from 'express';

@ApiTags('Authentication')
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Inscription d\'un nouvel utilisateur',
    description: 'Crée un nouveau compte utilisateur. Le compte est actif immédiatement et un token JWT est renvoyé.'
  })
  @ApiBody({
    type: RegisterDto,
    description: 'Informations d\'inscription de l\'utilisateur'
  })
  @ApiCreatedResponse({
    description: 'Utilisateur créé et connecté avec succès.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Registration successful' },
        access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        user: { type: 'object' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Données invalides ou validation échouée' 
  })
  @ApiConflictResponse({ 
    description: 'Utilisateur déjà existant avec ce téléphone ou email' 
  })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Connexion utilisateur',
    description: 'Authentifie un utilisateur avec email et mot de passe.'
  })
  @ApiBody({ 
    type: LoginDto,
    description: 'Identifiants de connexion (email + mot de passe)'
  })
  @ApiOkResponse({ 
    description: 'Connexion réussie',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        user: { 
          type: 'object',
          properties: {
            id: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            role: { type: 'string' }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Données de connexion invalides' 
  })
  @ApiUnauthorizedResponse({
    description: 'Identifiants invalides ou compte désactivé.'
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Récupérer le profil utilisateur',
    description: 'Récupère les informations du profil de l\'utilisateur connecté.'
  })
  @ApiOkResponse({ 
    description: 'Profil utilisateur récupéré avec succès',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        role: { type: 'string' },
        isActive: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Token JWT invalide ou expiré' 
  })
  getProfile(@Request() req) {
    return req.user;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Récupérer les données complètes de l\'utilisateur',
    description: 'Récupère toutes les informations de l\'utilisateur connecté avec son profil.'
  })
  async getMe(@Request() req) {
    // JwtStrategy.validate renvoie l'entité User, pas la charge utile du token :
    // req.user.sub n'existe pas ici, l'identifiant est req.user.id.
    const user = await this.authService.getUserWithProfile(req.user.id);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      profilePicture: user.profile?.avatar || user.profilePicture,
      isActive: user.isActive,
      createdAt: user.createdAt
    };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ 
    summary: 'Connexion avec Google',
    description: 'Redirige vers Google pour l\'authentification OAuth2.'
  })
  @ApiOkResponse({ 
    description: 'Redirection vers Google réussie' 
  })
  async googleAuth(@Request() req) {
    // Guard redirige automatiquement vers Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ 
    summary: 'Callback Google OAuth2',
    description: 'Traite le retour de Google après authentification.'
  })
  @ApiOkResponse({ 
    description: 'Authentification Google réussie' 
  })
  async googleAuthRedirect(@Request() req, @Res() res: Response) {
    const result = req.user;
    // Rediriger vers le frontend avec le token
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${result.access_token}`);
  }

  @Post('forgot-password')
  @ApiOperation({ 
    summary: 'Rechercher un compte par email',
    description: 'Recherche un compte utilisateur par email sans envoyer de code.'
  })
  @ApiBody({ 
    type: ForgotPasswordDto,
    description: 'Email pour rechercher le compte'
  })
  @ApiOkResponse({ 
    description: 'Compte trouvé avec succès',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User found' },
        email: { type: 'string', example: 'user@example.com' },
        user: { type: 'object' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Email invalide ou utilisateur non trouvé' 
  })
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('send-password-reset-code')
  @ApiOperation({ 
    summary: 'Envoyer le code de réinitialisation',
    description: 'Envoie un code OTP par email pour réinitialiser le mot de passe.'
  })
  @ApiBody({ 
    type: ForgotPasswordDto,
    description: 'Email pour recevoir le code de réinitialisation'
  })
  @ApiOkResponse({ 
    description: 'Code de réinitialisation envoyé avec succès',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password reset code sent to email' },
        email: { type: 'string', example: 'user@example.com' },
        expiresAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Email invalide ou utilisateur non trouvé' 
  })
  sendPasswordResetCode(@Body() body: ForgotPasswordDto) {
    return this.authService.sendPasswordResetCode(body.email);
  }

  @Post('reset-password')
  @ApiOperation({ 
    summary: 'Réinitialiser le mot de passe',
    description: 'Réinitialise le mot de passe avec le code OTP reçu par email.'
  })
  @ApiBody({ 
    type: ResetPasswordDto,
    description: 'Code OTP, email et nouveau mot de passe'
  })
  @ApiOkResponse({ 
    description: 'Mot de passe réinitialisé avec succès',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password reset successfully' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Code OTP invalide, expiré ou données invalides' 
  })
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.email, body.code, body.newPassword);
  }
}