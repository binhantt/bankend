import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    // Modify image_url column to TEXT
    await db.schema
        .alterTable('product_images')
        .modifyColumn('image_url', 'text')
        .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    // Revert back to varchar(255)
    await db.schema
        .alterTable('product_images')
        .modifyColumn('image_url', 'varchar(255)')
        .execute()
} 