import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('discounts')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('code', 'varchar(50)', (col) => col.notNull().unique())
    .addColumn('discount_type', 'varchar(20)', (col) => col.notNull())
    .addColumn('value', 'decimal', (col) => col.notNull())
    .addColumn('start_date', 'text', (col) => col.notNull())
    .addColumn('end_date', 'text', (col) => col.notNull())
    .addColumn('max_uses', 'integer')
    .addColumn('current_uses', 'integer', (col) => col.defaultTo(0))
    .execute()
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('discounts').execute()
}