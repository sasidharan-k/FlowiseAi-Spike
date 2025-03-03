import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddLiveWorkspaceDetails1740562902195 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create a new workspace table with the required columns
        await queryRunner.query(`
            CREATE TABLE "workspace_new" (
                "id" TEXT PRIMARY KEY,
                "name" TEXT NOT NULL,
                "description" TEXT NOT NULL,
                "createdDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updatedDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "organizationId" TEXT NOT NULL,
                "isLive" TEXT NOT NULL DEFAULT '',
                "liveWorkspaceId" TEXT NOT NULL DEFAULT ''
            );
        `)

        // Copy existing data into the new table
        await queryRunner.query(`
            INSERT INTO "workspace_new" ("id", "name", "description", "createdDate", "updatedDate", "organizationId")
            SELECT "id", "name", "description", "createdDate", "updatedDate", "organizationId"
            FROM "workspace";
        `)

        // Drop the old workspace table
        await queryRunner.query(`DROP TABLE "workspace";`)

        // Rename the new table to match the original name
        await queryRunner.query(`ALTER TABLE "workspace_new" RENAME TO "workspace";`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recreate the original workspace table without the new columns
        await queryRunner.query(`
            CREATE TABLE "workspace_old" (
                "id" TEXT PRIMARY KEY,
                "name" TEXT NOT NULL,
                "description" TEXT NOT NULL,
                "createdDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updatedDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "organizationId" TEXT NOT NULL
            );
        `)

        // Restore data into the original table structure
        await queryRunner.query(`
            INSERT INTO "workspace_old" ("id", "name", "description", "createdDate", "updatedDate", "organizationId")
            SELECT "id", "name", "description", "createdDate", "updatedDate", "organizationId"
            FROM "workspace";
        `)

        // Drop the new workspace table
        await queryRunner.query(`DROP TABLE "workspace";`)

        // Rename the old table back to "workspace"
        await queryRunner.query(`ALTER TABLE "workspace_old" RENAME TO "workspace";`)
    }
}
