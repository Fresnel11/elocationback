import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Email de l\'utilisateur',
    example: 'user@example.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Code OTP reçu par email',
    example: '123456'
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Nouveau mot de passe : 8 caractères minimum, avec au moins une majuscule, une minuscule et un chiffre',
    example: 'NewPassw0rd',
    minLength: 8
  })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
  })
  newPassword: string;
}