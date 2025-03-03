import { MigrationInterface, QueryRunner } from 'typeorm'

export class TylerExtAddCopyId1739971039891 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "chat_flow"
            ADD COLUMN IF NOT EXISTS "importedId" TEXT NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS "importedWorkspaceId" TEXT NOT NULL DEFAULT '';
        `)

        await queryRunner.query(`
            ALTER TABLE "tool"
            ADD COLUMN IF NOT EXISTS "importedId" TEXT NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS "importedWorkspaceId" TEXT NOT NULL DEFAULT '';
        `)

        await queryRunner.query(`
            ALTER TABLE "variable"
            ADD COLUMN IF NOT EXISTS "importedId" TEXT NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS "importedWorkspaceId" TEXT NOT NULL DEFAULT '';
        `)

        await queryRunner.query(`
            ALTER TABLE "assistant"
            ADD COLUMN IF NOT EXISTS "importedId" TEXT NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS "importedWorkspaceId" TEXT NOT NULL DEFAULT '';
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "chat_flow"
            DROP COLUMN IF EXISTS "importedId",
            DROP COLUMN IF EXISTS "importedWorkspaceId";
        `)

        await queryRunner.query(`
            ALTER TABLE "tool"
            DROP COLUMN IF EXISTS "importedId",
            DROP COLUMN IF EXISTS "importedWorkspaceId";
        `)

        await queryRunner.query(`
            ALTER TABLE "variable"
            DROP COLUMN IF EXISTS "importedId",
            DROP COLUMN IF EXISTS "importedWorkspaceId";
        `)

        await queryRunner.query(`
            ALTER TABLE "assistant"
            DROP COLUMN IF EXISTS "importedId",
            DROP COLUMN IF EXISTS "importedWorkspaceId";
        `)
    }
}
