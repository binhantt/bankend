import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('parent_categories')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('created_at', 'timestamp', (col) => 
            col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
        )
        .addColumn('updated_at', 'timestamp', (col) => 
            col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`)
        )
        .execute()

    // Add foreign key to categories table
    await db.schema
        .alterTable('categories')
        .addColumn('parent_id', 'integer', (col) => col.references('parent_categories.id'))
        .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.alterTable('categories').dropColumn('parent_id').execute()
    await db.schema.dropTable('parent_categories').ifExists().execute()
}