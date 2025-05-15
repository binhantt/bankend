import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('manufacturers')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('address', 'text')
        .addColumn('phone', 'varchar(20)')
        .addColumn('created_at', 'timestamp', (col) => 
            col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
        )
        .addColumn('updated_at', 'timestamp', (col) => 
            col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`)
        )
        .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('manufacturers').ifExists().execute()
}