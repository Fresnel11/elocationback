import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { DocumentType } from '../../users/entities/user-verification.entity';

export class ApplyDemarcheurDto {
  @ApiProperty({
    description: 'Villes ou quartiers où le démarcheur intervient',
    example: ['Cotonou', 'Abomey-Calavi'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Indiquez au moins une zone d\'intervention' })
  @ArrayMaxSize(10, { message: 'Dix zones au maximum' })
  @IsString({ each: true })
  zones!: string[];

  @ApiProperty({
    description: 'Années d\'expérience dans le démarchage',
    example: 3,
    minimum: 0,
    maximum: 60,
  })
  @IsInt()
  @Min(0)
  @Max(60)
  experienceYears!: number;

  @ApiProperty({
    description: 'Motivation et présentation de l\'activité',
    example: 'Je travaille depuis 3 ans sur Cotonou, principalement des appartements meublés.',
    minLength: 40,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(40, { message: 'Décrivez votre activité en 40 caractères minimum' })
  @MaxLength(1000)
  motivation!: string;

  @ApiProperty({ description: 'Présentation publique (optionnelle)', required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  // ---- Pièce d'identité : exigée seulement si le compte n'est pas encore vérifié ----

  @ApiProperty({
    description: "Type de pièce : carte nationale d'identité ou passeport",
    enum: DocumentType,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiProperty({ description: 'Photo du recto de la pièce (data URL)', required: false })
  @IsOptional()
  @IsString()
  documentFrontPhoto?: string;

  @ApiProperty({
    description: 'Photo du verso, requise pour une CNI',
    required: false,
  })
  @IsOptional()
  @IsString()
  documentBackPhoto?: string;

  @ApiProperty({ description: 'Photo du visage, pour rapprochement avec la pièce', required: false })
  @IsOptional()
  @IsString()
  selfiePhoto?: string;
}
