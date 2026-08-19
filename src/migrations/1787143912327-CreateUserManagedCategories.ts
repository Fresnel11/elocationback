import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserManagedCategories1787143912327 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE user_managed_categories (
                userId varchar(36) NOT NULL,
                categoryId varchar(36) NOT NULL,
                PRIMARY KEY (userId, categoryId),
                CONSTRAINT FK_user_managed_categories_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT FK_user_managed_categories_category FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE user_managed_categories`);
    }

}
