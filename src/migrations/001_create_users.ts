import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable('users')
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('email', 'varchar(255)', (col) => col.notNull())
    .addColumn('password', 'text', (col) => col.notNull())
    .addColumn('phone', 'text')
    .addColumn('address', 'text')
    .addColumn('role', 'text', (col) => col.notNull())
    .addColumn('balance', 'text', (col) => col.notNull())
    .addColumn('refresh_token', 'text')  // Add refresh token column
    .addColumn('is_active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .execute()
    .then(() => db.schema
      .createIndex('email_unique_idx')
      .on('users')
      .column('email')
      .unique()
      .execute()
    )
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable('users').execute()
}