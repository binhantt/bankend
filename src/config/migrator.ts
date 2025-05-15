import { FileMigrationProvider, Migrator } from 'kysely'
import * as path from 'path'
import { db } from './database'
import { promises as fs } from 'fs'

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.join(__dirname, '../migrations')
  })
})

async function migrateToLatest() {
  const { error, results } = await migrator.migrateToLatest()

  if (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }

  results?.forEach((migration) => {
    console.log(`Migration "${migration.migrationName}" was executed successfully`)
  })
}

migrateToLatest()