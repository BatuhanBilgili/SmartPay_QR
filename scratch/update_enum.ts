import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

async function updateEnum() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    await sql`ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'ready';`;
    console.log('order_status updated');
  } catch(e) {
    console.log('error or already exists order_status', e);
  }
  try {
    await sql`ALTER TYPE order_item_status ADD VALUE IF NOT EXISTS 'ready';`;
    console.log('order_item_status updated');
  } catch(e) {
    console.log('error or already exists order_item_status', e);
  }
}

updateEnum();
