/**
 * Crée la base de données si elle n'existe pas.
 *
 * TypeORM (`synchronize: true`) crée les TABLES, jamais la BASE : MySQL refuse
 * la connexion avec « Unknown database » avant même que TypeORM ait la main.
 * Ce script comble ce trou — à lancer une fois avant le premier démarrage,
 * ou après une suppression de la base.
 *
 *   npm run db:create
 *
 * Il ne touche à rien si la base existe déjà.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const name = process.env.DB_NAME;

(async () => {
  if (!name) {
    console.error('DB_NAME absent du fichier .env — rien à créer.');
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    // Pas de `database` ici : c'est précisément ce qu'on cherche à créer.
  });

  const [existing] = await connection.query(
    'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
    [name],
  );

  if (existing.length) {
    console.log(`Base "${name}" déjà présente, aucune modification.`);
  } else {
    // utf8mb4 : accents français et emojis stockés correctement.
    await connection.query(
      `CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    console.log(`Base "${name}" créée.`);
    console.log('Étapes suivantes :');
    console.log('  1. npm run start:dev        → TypeORM crée les tables');
    console.log('  2. POST /init/base-data     → rôles, permissions, catégories');
  }

  await connection.end();
})().catch((error) => {
  console.error('Échec de la création de la base :', error.message);
  process.exit(1);
});
