import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { DemarcheurStatus } from '../entities/demarcheur-profile.entity';

export class ReviewDemarcheurDto {
  @ApiProperty({
    description: 'Décision de l\'administrateur',
    enum: [DemarcheurStatus.APPROVED, DemarcheurStatus.REJECTED, DemarcheurStatus.SUSPENDED],
    example: DemarcheurStatus.APPROVED,
  })
  @IsEnum(DemarcheurStatus)
  status!: DemarcheurStatus;

  @ApiProperty({
    description: 'Motif, obligatoire en cas de refus ou de suspension',
    required: false,
    example: 'Zones d\'intervention non renseignées précisément.',
  })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'Le motif doit être compréhensible par le candidat' })
  @MaxLength(500)
  reason?: string;
}
