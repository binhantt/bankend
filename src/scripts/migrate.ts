import { db } from '../config/database'
import * as createUsers from '../migrations/001_create_users'

async function migrateToLatest() {
  await createUsers.up(db)
  console.log('✅ Migrations completed')
}

async function migrateDown() {
  await createUsers.down(db)
  console.log('✅ Rollback completed')
}

async function migrateFresh() {
  try {
    await migrateDown()
  } catch (error) {
    console.log('No tables to drop')
  }
  await migrateToLatest()
}

const command = process.argv[2]
switch (command) {
  case 'latest':
    migrateToLatest()
    break
  case 'down':
    migrateDown()
    break
  case 'fresh':
    migrateFresh()
    break
  default:
    console.error('Invalid command. Use: latest, down, or fresh')
}