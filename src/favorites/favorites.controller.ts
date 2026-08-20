import { Controller, Get, Post, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  async getUserFavorites(@Request() req) {
    return this.favoritesService.getUserFavorites(req.user.id);
  }

  @Post(':adId')
  async addToFavorites(@Param('adId') adId: string, @Request() req) {
    return this.favoritesService.addToFavorites(req.user.id, adId);
  }

  @Delete(':adId')
  async removeFromFavorites(@Param('adId') adId: string, @Request() req) {
    return this.favoritesService.removeFromFavorites(req.user.id, adId);
  }

  @Get('check/:adId')
  async isFavorite(@Param('adId') adId: string, @Request() req) {
    return this.favoritesService.isFavorite(req.user.id, adId);
  }
}