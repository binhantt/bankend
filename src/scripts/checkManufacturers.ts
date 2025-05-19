import { db } from '../config/database';

async function checkManufacturers() {
  try {
    const manufacturers = await db.selectFrom('manufacturers')
      .select(['id', 'name', 'address', 'phone', 'created_at'])
      .execute();

    console.log('Danh sách manufacturers trong database:');
    console.table(manufacturers);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

checkManufacturers(); 