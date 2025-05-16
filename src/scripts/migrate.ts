import { db } from '../config/database'
import * as createUsers from '../migrations/001_create_users'
import * as createCategories from '../migrations/002_create_categories'
import * as createProducts from '../migrations/003_create_products'
import * as createOrderItems from '../migrations/004_create_order_items'
import * as createOrders from '../migrations/005_create_orders'
import * as createWishlists from '../migrations/008_create_wishlists'
import * as createDiscounts from '../migrations/009_create_discounts'
import * as createOrderDiscounts from '../migrations/010_create_order_discounts'
import * as createShippingMethods from '../migrations/011_create_shipping_methods'
import * as createProductIntros from '../migrations/012_create_product_intros'
import * as createParentCategories from '../migrations/014_create_parent_categories'
import * as createManufacturers from '../migrations/016_create_manufacturers'
import * as createProductCategories from '../migrations/017_create_product_categories'

async function runMigration(migration: { up: Function, down: Function }, action: 'up' | 'down') {
  try {
    await migration[action](db)
    console.log(`✅ Migration executed successfully`)
    return true
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log(`⚠️ Table already exists, skipping`)
      return true
    }
    console.error(`❌ Migration failed: ${error}`)
    return false
  }
}

async function migrateToLatest() {
  const migrations = [
    { name: 'users', migration: createUsers },
    { name: 'categories', migration: createCategories },
    { name: 'products', migration: createProducts },
    { name: 'product_intros', migration: createProductIntros },
    { name: 'order_items', migration: createOrderItems },
    { name: 'orders', migration: createOrders },
    { name: 'wishlists', migration: createWishlists },
    { name: 'discounts', migration: createDiscounts },
    { name: 'order_discounts', migration: createOrderDiscounts },
    { name: 'shipping_methods', migration: createShippingMethods },
    { name: 'parent_categories', migration: createParentCategories },
    { name: 'manufacturers', migration: createManufacturers },
    { name: 'product_categories', migration: createProductCategories }
  ]

  for (const { name, migration } of migrations) {
    console.log(`Running migration for ${name}...`)
    const success = await runMigration(migration, 'up')
    if (!success) return
  }
  console.log('✅ All migrations completed successfully')
}

async function migrateDown() {
  // Drop all tables in reverse order
  await createManufacturers.down(db);
  await createParentCategories.down(db);
  await createShippingMethods.down(db);
  await createUsers.down(db);
  console.log('✅ All tables dropped');
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