import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

async function addPaidQuantity() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS paid_quantity INTEGER NOT NULL DEFAULT 0;`;
    console.log('paid_quantity added to order_items');
  } catch(e) {
    console.log('error or already exists', e);
  }
}

addPaidQuantity();
