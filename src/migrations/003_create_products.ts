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
        .addColumn('manufacturer_id', 'integer', (col) =>
            col.references('manufacturers.id').onDelete('set null')
        )
        .addColumn('main_image_url', 'varchar(255)')
        .addColumn('stock', 'integer', (col) => col.notNull().defaultTo(0))
        .addColumn('sku', 'varchar(50)', (col) => col.unique())
        .addColumn('weight', sql`decimal(10,2)`)
        .addColumn('dimensions', 'varchar(50)')
        .addColumn('quantity', 'integer', (col) => col.notNull().defaultTo(0))
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

    // Create product_details table for additional product information
    await db.schema
        .createTable('product_details')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('product_id', 'integer', (col) => 
            col.references('products.id').onDelete('cascade').notNull()
        )
        .addColumn('spec_name', 'varchar(255)', (col) => col.notNull())
        .addColumn('spec_value', 'text', (col) => col.notNull())
        .addColumn('sort_order', 'integer', (col) => col.notNull().defaultTo(0))
        .addColumn('created_at', 'timestamp', (col) => 
            col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
        )
        .addColumn('updated_at', 'timestamp', (col) => 
            col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`)
        )
        .execute()

    // Create warranties table
    await db.schema
        .createTable('warranties')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('product_id', 'integer', (col) => 
            col.references('products.id').onDelete('cascade').notNull()
        )
        .addColumn('warranty_period', 'varchar(50)', (col) => col.notNull())
        .addColumn('warranty_provider', 'varchar(100)', (col) => col.notNull())
        .addColumn('warranty_conditions', 'text', (col) => col.notNull())
        .addColumn('created_at', 'timestamp', (col) => 
            col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
        )
        .addColumn('updated_at', 'timestamp', (col) => 
            col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`)
        )
        .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    // Drop tables in reverse order
    await db.schema.dropTable('warranties').ifExists().execute()
    await db.schema.dropTable('product_images').ifExists().execute()
    await db.schema.dropTable('products').ifExists().execute()
    await db.schema.dropTable('product_details').ifExists().execute()
}