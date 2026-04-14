import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';
import { tables } from './src/lib/db/schema';

dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL not found!');
  process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle(sql);

async function test() {
  console.log('Testing DB connection...');
  try {
    const allTables = await db.select().from(tables).limit(1);
    if (allTables.length === 0) {
      console.log('No tables found. DB is likely empty. You might need to run the seed script.');
      return;
    }
    const table = allTables[0];
    console.log('Found table:', table.tableNumber, 'Token:', table.currentToken);

    // Test the API endpoint
    console.log(`\nTesting API endpoint: http://localhost:3000/api/tables/${table.currentToken}`);
    const res = await fetch(`http://localhost:3000/api/tables/${table.currentToken}`);
    const json = await res.json();
    console.log('API Response Status:', res.status);
    console.log('API Response Data keys:', Object.keys(json));
    if (json.success) {
      console.log('Restaurant name:', json.data.restaurant.name);
      console.log('Number of categories:', json.data.restaurant.categories?.length);
      console.log('Active session:', json.data.activeSession ? json.data.activeSession.token : 'None');
      console.log('\n--- SUCCESS: Database connection and API route are working! ---');
    } else {
      console.log('API returned error:', json.error);
    }
  } catch (err) {
    console.error('DB test failed:', err);
  }
}

test();
