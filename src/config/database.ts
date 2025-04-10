import { Kysely, MysqlDialect } from 'kysely'
import { createPool } from 'mysql2'
import { env } from './env'

const dialect = new MysqlDialect({
  pool: createPool({
    host: env.db.host,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    port: env.db.port,
    connectionLimit: 10
  })
})

export const db = new Kysely<any>({
  dialect
})