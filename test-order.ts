import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';
import { tables, menuItems } from './src/lib/db/schema';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function testOrder() {
  console.log('Testing Database Orders API Integration...');

  try {
    // 1. Get a table token and menu items
    const allTables = await db.select().from(tables).limit(1);
    if (allTables.length === 0) throw new Error('No tables found');
    const tableToken = allTables[0].currentToken;

    const allItems = await db.select().from(menuItems).limit(2);
    if (allItems.length === 0) throw new Error('No items found');
    
    console.log(`Using Table Token: ${tableToken}`);
    console.log(`Order Items: ${allItems.map(i => i.name).join(', ')}`);

    // 2. Prepare payload
    const payload = {
      tableToken,
      customerName: 'Test Bot',
      items: allItems.map((item, index) => ({
        menuItemId: item.id,
        quantity: index + 1, // e.g., 1 of item 1, 2 of item 2 
        notes: 'Acı olmasın'
      }))
    };

    // 3. Make the API request
    console.log('Sending request to /api/orders...');
    const res = await fetch('http://localhost:3000/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log(`API Status: ${res.status}`);
    console.log('API Response:', JSON.stringify(data, null, 2));

    if (data.success && data.order) {
       console.log(`✅ Order successfully saved to database with ID: ${data.order.id}`);
       console.log(`Total Amount calculated by server: ${data.order.totalAmount}`);
    } else {
       console.error('❌ Failed to save order.');
    }

  } catch (err) {
    console.error('Test script crashed:', err);
  }
}

testOrder();
