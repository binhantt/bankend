import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('order_discounts')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('order_id', 'integer', (col) => col.notNull().references('orders.id'))
    .addColumn('discount_id', 'integer', (col) => col.notNull().references('discounts.id'))
    .addColumn('discount_amount', 'decimal', (col) => col.notNull())
    .execute()
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('order_discounts').execute()
}