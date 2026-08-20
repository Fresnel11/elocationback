import 'dotenv/config';
import { DataSource } from 'typeorm';
import { join } from 'path';

/**
 * DataSource pour le CLI TypeORM (migration:generate / migration:run / migration:revert),
 * séparé de TypeOrmModule.forRoot() dans app.module.ts qui sert au runtime Nest.
 * Mêmes identifiants de connexion, mais `entities`/`migrations` en glob explicite :
 * le CLI n'a pas accès à `autoLoadEntities` (spécifique à Nest, basé sur `forFeature`).
 */
export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '3306'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [join(__dirname, '**', '*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
  synchronize: false,
});
