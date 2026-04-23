import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const { db } = require('../src/lib/db');
const { users, restaurants } = require('../src/lib/db/schema');

async function addCashierUser() {
  const allRest = await db.query.restaurants.findMany({ limit: 1 });
  if (allRest.length === 0) {
    console.log('No restaurants found!');
    return;
  }
  const restaurant = allRest[0];
  
  await db.insert(users).values({
    restaurantId: restaurant.id,
    username: 'kasa',
    passwordHash: '123456',
    role: 'cashier',
    name: 'Kasa Görevlisi',
  }).onConflictDoNothing();
  
  console.log('Cashier user added successfully!');
}

addCashierUser().catch(console.error);
