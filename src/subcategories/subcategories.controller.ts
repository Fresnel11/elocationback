import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { SubCategoriesService } from './subcategories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('subcategories')
export class SubCategoriesController {
  constructor(private readonly subCategoriesService: SubCategoriesService) {}

  @Get()
  async findByCategory(@Query('categoryId') categoryId?: string) {
    if (categoryId) {
      return this.subCategoriesService.findByCategory(categoryId);
    }
    return this.subCategoriesService.findAll();
  }

  // POST/PUT/DELETE manquaient ici alors que CategoriesManagement.tsx les appelle déjà
  // (`/subcategories`, pas `/admin/subcategories`) : la gestion des sous-catégories
  // échouait en 404 depuis l'UI, pour tous les rôles.
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CATEGORY_MANAGER)
  async create(@Body() subCategoryData: { name: string; description?: string; categoryId: string }, @Request() req) {
    return this.subCategoriesService.create(subCategoryData, req.user);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CATEGORY_MANAGER)
  async update(@Param('id') id: string, @Body() subCategoryData: any, @Request() req) {
    return this.subCategoriesService.update(id, subCategoryData, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CATEGORY_MANAGER)
  async remove(@Param('id') id: string, @Request() req) {
    await this.subCategoriesService.remove(id, req.user);
    return { message: 'Sous-catégorie supprimée avec succès' };
  }
}