import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, MinLength, Matches, IsBoolean, IsDateString, IsEnum } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Prénom de l\'utilisateur',
    example: 'Jean',
    minLength: 2,
    maxLength: 50
  })
  @IsString()
  @MinLength(2)
  firstName!: string;

  @ApiProperty({
    description: 'Nom de famille de l\'utilisateur',
    example: 'Cossou',
    minLength: 2,
    maxLength: 50
  })
  @IsString()
  @MinLength(2)
  lastName!: string;

  @ApiProperty({
    description: 'Numéro de téléphone (format international)',
    example: '+22999154678',
    pattern: '^\\+[1-9]\\d{1,14}$',
    minLength: 10,
    maxLength: 15
  })
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Le numéro de téléphone doit être au format international (+22999154678)'
  })
  phone!: string;

  @ApiProperty({
    description: 'Email de l\'utilisateur (optionnel)',
    example: 'jean.cossou@example.com',
    required: false,
    maxLength: 100
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Mot de passe : 8 caractères minimum, avec au moins une majuscule, une minuscule et un chiffre',
    example: 'Passw0rd',
    minLength: 8,
    maxLength: 100
  })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
  })
  password!: string;

  @ApiProperty({
    description: 'Code de parrainage (optionnel)',
    example: 'JEA123ABC',
    required: false,
    maxLength: 10
  })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiProperty({
    description: 'Date de naissance (YYYY-MM-DD)',
    example: '1990-01-01'
  })
  @IsDateString()
  birthDate!: string;

  @ApiProperty({
    description: 'Sexe de l\'utilisateur',
    example: 'masculin',
    enum: ['masculin', 'féminin']
  })
  @IsEnum(['masculin', 'féminin'])
  gender!: 'masculin' | 'féminin';

  @ApiProperty({
    description: 'Acceptation des conditions d\'utilisation',
    example: true
  })
  @IsBoolean()
  acceptedTerms!: boolean;
}