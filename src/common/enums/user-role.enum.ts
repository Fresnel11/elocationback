export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
  /** Accès admin délégué, restreint aux catégories listées dans `User.managedCategories`. */
  CATEGORY_MANAGER = 'category_manager',
}