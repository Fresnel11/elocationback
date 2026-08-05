import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { DemarcheursService } from './demarcheurs.service';
import { ApplyDemarcheurDto } from './dto/apply-demarcheur.dto';
import { ReviewDemarcheurDto } from './dto/review-demarcheur.dto';
import { DemarcheurStatus } from './entities/demarcheur-profile.entity';

@ApiTags('Démarcheurs')
@Controller('demarcheurs')
export class DemarcheursController {
  constructor(private readonly demarcheursService: DemarcheursService) {}

  // ------------------------------- Public ----------------------------------

  @Get()
  @ApiOperation({
    summary: 'Annuaire des démarcheurs',
    description: 'Liste publique des démarcheurs approuvés, filtrable par zone.',
  })
  @ApiQuery({ name: 'zone', required: false, example: 'Cotonou' })
  findAll(@Query('zone') zone?: string) {
    return this.demarcheursService.findPublic(zone);
  }

  // Placé avant :userId, sinon « me » serait interprété comme un identifiant.
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Ma candidature de démarcheur',
    description: 'Renvoie la candidature de l\'utilisateur courant, ou null.',
  })
  findMine(@Request() req) {
    return this.demarcheursService.findMine(req.user.id);
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Candidater comme démarcheur',
    description:
      'L\'identité doit être vérifiée au préalable. Une candidature refusée peut être redéposée.',
  })
  apply(@Request() req, @Body() dto: ApplyDemarcheurDto) {
    return this.demarcheursService.apply(req.user.id, dto);
  }

  // ---------------------------- Administration ------------------------------

  @Get('applications')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Candidatures à examiner' })
  @ApiQuery({ name: 'status', required: false, enum: DemarcheurStatus })
  findApplications(@Query('status') status?: DemarcheurStatus) {
    return this.demarcheursService.findApplications(status);
  }

  @Patch('applications/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Approuver, refuser ou suspendre un démarcheur',
    description: 'Un motif est exigé pour un refus ou une suspension.',
  })
  review(@Param('id') id: string, @Request() req, @Body() dto: ReviewDemarcheurDto) {
    return this.demarcheursService.review(id, req.user.id, dto);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Profil public d\'un démarcheur' })
  @ApiOkResponse({ description: 'Profil trouvé' })
  findOne(@Param('userId') userId: string) {
    return this.demarcheursService.findPublicOne(userId);
  }
}
