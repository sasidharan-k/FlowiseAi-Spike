import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddLiveWorkspaceDetails1740562902195 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "workspace"
            ADD COLUMN IF NOT EXISTS "isLive" TEXT NOT NULL DEFAULT '',
            ADD COLUMN IF NOT EXISTS "liveWorkspaceId" TEXT NOT NULL DEFAULT '';
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "workspace"
            DROP COLUMN IF EXISTS "isLive",
            DROP COLUMN IF EXISTS "liveWorkspaceId";
        `)
    }
}
