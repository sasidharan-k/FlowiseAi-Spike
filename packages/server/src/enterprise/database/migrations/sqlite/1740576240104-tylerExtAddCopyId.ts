import { MigrationInterface, QueryRunner } from 'typeorm'

export class TylerExtAddCopyId1739971039891 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create new tables with the additional columns
        await queryRunner.query(`
            CREATE TABLE "chat_flow_new" (
                "id" TEXT PRIMARY KEY,
                "name" TEXT NOT NULL,
                "flowData" TEXT NOT NULL,
                "deployed" BOOLEAN,
                "isPublic" BOOLEAN,
                "apikeyid" TEXT,
                "chatbotConfig" TEXT,
                "apiConfig" TEXT,
                "analytic" TEXT,
                "speechToText" TEXT,
                "followUpPrompts" TEXT,
                "category" TEXT,
                "type" TEXT,
                "createdDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updatedDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "workspaceId" TEXT,
                "importedId" TEXT NOT NULL DEFAULT '',
                "importedWorkspaceId" TEXT NOT NULL DEFAULT ''
            );
        `)

        await queryRunner.query(`
            INSERT INTO "chat_flow_new" ("id", "name", "flowData", "deployed", "isPublic", "apikeyid", "chatbotConfig", "apiConfig", "analytic", "speechToText", "followUpPrompts", "category", "type", "createdDate", "updatedDate", "workspaceId")
            SELECT "id", "name", "flowData", "deployed", "isPublic", "apikeyid", "chatbotConfig", "apiConfig", "analytic", "speechToText", "followUpPrompts", "category", "type", "createdDate", "updatedDate", "workspaceId"
            FROM "chat_flow";
        `)

        await queryRunner.query(`DROP TABLE "chat_flow";`)
        await queryRunner.query(`ALTER TABLE "chat_flow_new" RENAME TO "chat_flow";`)

        // Repeat for other tables
        await queryRunner.query(`
            CREATE TABLE "tool_new" (
                "id" TEXT PRIMARY KEY,
                "name" TEXT NOT NULL,
                "description" TEXT NOT NULL,
                "color" TEXT NOT NULL,
                "iconSrc" TEXT,
                "schema" TEXT,
                "func" TEXT,
                "createdDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updatedDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "workspaceId" TEXT,
                "importedId" TEXT NOT NULL DEFAULT '',
                "importedWorkspaceId" TEXT NOT NULL DEFAULT ''
            );
        `)

        await queryRunner.query(`
            INSERT INTO "tool_new" ("id", "name", "description", "color", "iconSrc", "schema", "func", "createdDate", "updatedDate", "workspaceId")
            SELECT "id", "name", "description", "color", "iconSrc", "schema", "func", "createdDate", "updatedDate", "workspaceId"
            FROM "tool";
        `)

        await queryRunner.query(`DROP TABLE "tool";`)
        await queryRunner.query(`ALTER TABLE "tool_new" RENAME TO "tool";`)

        await queryRunner.query(`
            CREATE TABLE "variable_new" (
                "id" TEXT PRIMARY KEY,
                "name" TEXT NOT NULL,
                "value" TEXT,
                "type" TEXT DEFAULT 'string',
                "createdDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updatedDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "workspaceId" TEXT,
                "importedId" TEXT NOT NULL DEFAULT '',
                "importedWorkspaceId" TEXT NOT NULL DEFAULT ''
            );
        `)

        await queryRunner.query(`
            INSERT INTO "variable_new" ("id", "name", "value", "type", "createdDate", "updatedDate", "workspaceId")
            SELECT "id", "name", "value", "type", "createdDate", "updatedDate", "workspaceId"
            FROM "variable";
        `)

        await queryRunner.query(`DROP TABLE "variable";`)
        await queryRunner.query(`ALTER TABLE "variable_new" RENAME TO "variable";`)

        await queryRunner.query(`
            CREATE TABLE "assistant_new" (
                "id" TEXT PRIMARY KEY,
                "details" TEXT NOT NULL,
                "credential" TEXT NOT NULL,
                "iconSrc" TEXT,
                "type" TEXT,
                "createdDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updatedDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "workspaceId" TEXT,
                "importedId" TEXT NOT NULL DEFAULT '',
                "importedWorkspaceId" TEXT NOT NULL DEFAULT ''
            );
        `)

        await queryRunner.query(`
            INSERT INTO "assistant_new" ("id", "details", "credential", "iconSrc", "type", "createdDate", "updatedDate", "workspaceId")
            SELECT "id", "details", "credential", "iconSrc", "type", "createdDate", "updatedDate", "workspaceId"
            FROM "assistant";
        `)

        await queryRunner.query(`DROP TABLE "assistant";`)
        await queryRunner.query(`ALTER TABLE "assistant_new" RENAME TO "assistant";`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Rollback to previous table structure
        await queryRunner.query(`
            CREATE TABLE "chat_flow_old" (
                "id" TEXT PRIMARY KEY,
                "name" TEXT NOT NULL,
                "flowData" TEXT NOT NULL,
                "deployed" BOOLEAN,
                "isPublic" BOOLEAN,
                "apikeyid" TEXT,
                "chatbotConfig" TEXT,
                "apiConfig" TEXT,
                "analytic" TEXT,
                "speechToText" TEXT,
                "followUpPrompts" TEXT,
                "category" TEXT,
                "type" TEXT,
                "createdDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updatedDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "workspaceId" TEXT
            );
        `)

        await queryRunner.query(`
            INSERT INTO "chat_flow_old" SELECT "id", "name", "flowData", "deployed", "isPublic", "apikeyid", "chatbotConfig", "apiConfig", "analytic", "speechToText", "followUpPrompts", "category", "type", "createdDate", "updatedDate", "workspaceId"
            FROM "chat_flow";
        `)

        await queryRunner.query(`DROP TABLE "chat_flow";`)
        await queryRunner.query(`ALTER TABLE "chat_flow_old" RENAME TO "chat_flow";`)

        await queryRunner.query(`
            CREATE TABLE "tool_old" (
                "id" TEXT PRIMARY KEY,
                "name" TEXT NOT NULL,
                "description" TEXT NOT NULL,
                "color" TEXT NOT NULL,
                "iconSrc" TEXT,
                "schema" TEXT,
                "func" TEXT,
                "createdDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updatedDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "workspaceId" TEXT
            );
        `)

        await queryRunner.query(`
            INSERT INTO "tool_old" SELECT "id", "name", "description", "color", "iconSrc", "schema", "func", "createdDate", "updatedDate", "workspaceId"
            FROM "tool";
        `)

        await queryRunner.query(`DROP TABLE "tool";`)
        await queryRunner.query(`ALTER TABLE "tool_old" RENAME TO "tool";`)

        await queryRunner.query(`
            CREATE TABLE "variable_old" (
                "id" TEXT PRIMARY KEY,
                "name" TEXT NOT NULL,
                "value" TEXT,
                "type" TEXT DEFAULT 'string',
                "createdDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updatedDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "workspaceId" TEXT
            );
        `)

        await queryRunner.query(`
            INSERT INTO "variable_old" SELECT "id", "name", "value", "type", "createdDate", "updatedDate", "workspaceId"
            FROM "variable";
        `)

        await queryRunner.query(`DROP TABLE "variable";`)
        await queryRunner.query(`ALTER TABLE "variable_old" RENAME TO "variable";`)

        await queryRunner.query(`
            CREATE TABLE "assistant_old" (
                "id" TEXT PRIMARY KEY,
                "details" TEXT NOT NULL,
                "credential" TEXT NOT NULL,
                "iconSrc" TEXT,
                "type" TEXT,
                "createdDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "updatedDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
                "workspaceId" TEXT
            );
        `)

        await queryRunner.query(`
            INSERT INTO "assistant_old" SELECT "id", "details", "credential", "iconSrc", "type", "createdDate", "updatedDate", "workspaceId"
            FROM "assistant";
        `)

        await queryRunner.query(`DROP TABLE "assistant";`)
        await queryRunner.query(`ALTER TABLE "assistant_old" RENAME TO "assistant";`)
    }
}
