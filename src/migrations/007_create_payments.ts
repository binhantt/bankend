import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('payments')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('order_id', 'integer', (col) => col.notNull().references('orders.id'))
    .addColumn('amount', 'decimal', (col) => col.notNull())
    .addColumn('payment_method', 'varchar(50)', (col) => col.notNull())
    .addColumn('status', 'varchar(20)', (col) => col.notNull().defaultTo('pending'))
    .addColumn('transaction_id', 'varchar(100)')
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute()
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('payments').execute()
}