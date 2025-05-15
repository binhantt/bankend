import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('order_items')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('order_id', 'integer', (col) => col.notNull().references('orders.id'))
    .addColumn('product_id', 'integer', (col) => col.notNull().references('products.id'))
    .addColumn('quantity', 'integer', (col) => col.notNull())
    .addColumn('price', 'decimal', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute()
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('order_items').execute()
}