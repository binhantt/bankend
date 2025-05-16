import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    // Create product_categories table first
  

    // Then create the join table
    await db.schema
        .createTable('product_category_relations')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('product_id', 'integer', (col) => col.notNull().references('products.id'))
        .addColumn('product_category_id', 'integer', (col) => col.notNull().references('product_categories.id'))
        .addColumn('created_at', 'timestamp', (col) => 
            col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
        )
        .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('product_category_relations').ifExists().execute();
}