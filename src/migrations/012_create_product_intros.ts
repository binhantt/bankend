import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('product_intros')
        .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
        .addColumn('image_url', 'varchar(255)', (col) => col.notNull())
        .addColumn('title', 'varchar(255)', (col) => col.notNull())
        .addColumn('subtitle', 'varchar(255)')
        .addColumn('button1_text', 'varchar(50)')
        .addColumn('button1_link', 'varchar(255)')
        .addColumn('button2_text', 'varchar(50)')
        .addColumn('button2_link', 'varchar(255)')
        .addColumn('created_at', 'timestamp', (col) => 
            col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
        )
        .addColumn('updated_at', 'timestamp', (col) =>
            col.notNull().defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`)
        )
        .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('product_intros').ifExists().execute()
}