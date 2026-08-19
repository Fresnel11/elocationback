import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createReviewDto: CreateReviewDto, @Request() req) {
    return this.reviewsService.create(createReviewDto, req.user.id);
  }

  @Get('ad/:adId')
  findByAd(@Param('adId') adId: string) {
    return this.reviewsService.findByAd(adId);
  }

  @Get('ad/:adId/rating')
  getAdRating(@Param('adId') adId: string) {
    return this.reviewsService.getAdRating(adId);
  }

  @Get('user/:userId')
  getUserReviews(@Param('userId') userId: string) {
    return this.reviewsService.getUserReviews(userId);
  }

  // Ces 3 routes dupliquent /admin/reviews/* (admin.controller.ts), qui applique le
  // scoping par catégorie pour category_manager. Elles n'étaient protégées que par
  // JwtAuthGuard (n'importe quel utilisateur connecté pouvait modérer les avis) — corrigé
  // en les réservant à admin/super_admin, sans les ouvrir à category_manager pour éviter
  // de dupliquer la logique de scoping dans deux contrôleurs.
  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getPendingReviews(@Request() req) {
    return this.reviewsService.getPendingReviews();
  }

  @Post('admin/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  approveReview(@Param('id') id: string, @Request() req) {
    return this.reviewsService.approveReview(id);
  }

  @Post('admin/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  rejectReview(@Param('id') id: string, @Request() req) {
    return this.reviewsService.rejectReview(id);
  }
}