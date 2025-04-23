import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    // Create products table with main image
    await db.schema
        .createTable('products')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('description', 'text')
        .addColumn('price', sql`decimal(10,2)`, (col) => col.notNull())
        .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
        .addColumn('category_id', 'integer', (col) => 
            col.references('categories.id').onDelete('set null')
        )
        .addColumn('main_image_url', 'varchar(255)')
        .addColumn('stock', 'integer', (col) => col.notNull().defaultTo(0))
        .addColumn('sku', 'varchar(50)', (col) => col.unique())
        .addColumn('weight', sql`decimal(10,2)`)
        .addColumn('dimensions', 'varchar(50)')
        .addColumn('created_at', 'timestamp', (col) => 
            col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
        )
        .addColumn('updated_at', 'timestamp', (col) => 
            col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`)
        )
        .execute()

    // Create product_images table for multiple images
    await db.schema
        .createTable('product_images')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('product_id', 'integer', (col) => 
            col.references('products.id').onDelete('cascade').notNull()
        )
        .addColumn('image_url', 'varchar(255)', (col) => col.notNull())
        .addColumn('sort_order', 'integer', (col) => col.notNull().defaultTo(0))
        .addColumn('created_at', 'timestamp', (col) => 
            col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
        )
        .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    // Drop tables in reverse order
    await db.schema.dropTable('product_images').ifExists().execute()
    await db.schema.dropTable('products').ifExists().execute()
}