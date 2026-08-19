import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubCategory } from './entities/subcategory.entity';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class SubCategoriesService {
  constructor(
    @InjectRepository(SubCategory)
    private subCategoryRepository: Repository<SubCategory>,
  ) {}

  async findAll(): Promise<SubCategory[]> {
    return this.subCategoryRepository.find({
      where: { isActive: true },
      relations: ['category'],
    });
  }

  async findByCategory(categoryId: string): Promise<SubCategory[]> {
    return this.subCategoryRepository.find({
      where: { categoryId, isActive: true },
      relations: ['category'],
    });
  }

  /** Un category_manager ne peut créer/modifier/supprimer que des sous-catégories de ses catégories déléguées. */
  private assertCategoryAccess(user: any, categoryId: string | null | undefined) {
    if (user?.role?.name !== UserRole.CATEGORY_MANAGER) {
      return;
    }
    const managedIds = (user?.managedCategories || []).map((c: any) => c.id);
    if (!categoryId || !managedIds.includes(categoryId)) {
      throw new ForbiddenException('Cette catégorie ne fait pas partie de votre périmètre');
    }
  }

  async create(subCategoryData: { name: string; description?: string; categoryId: string }, user?: any): Promise<SubCategory> {
    this.assertCategoryAccess(user, subCategoryData.categoryId);
    const subCategory = this.subCategoryRepository.create(subCategoryData);
    return this.subCategoryRepository.save(subCategory);
  }

  async update(id: string, subCategoryData: Partial<SubCategory>, user?: any): Promise<SubCategory> {
    const existing = await this.subCategoryRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Sous-catégorie non trouvée');
    }
    this.assertCategoryAccess(user, existing.categoryId);

    await this.subCategoryRepository.update(id, subCategoryData);
    return this.subCategoryRepository.findOne({ where: { id } });
  }

  async remove(id: string, user?: any): Promise<void> {
    const existing = await this.subCategoryRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Sous-catégorie non trouvée');
    }
    this.assertCategoryAccess(user, existing.categoryId);

    await this.subCategoryRepository.delete(id);
  }
}