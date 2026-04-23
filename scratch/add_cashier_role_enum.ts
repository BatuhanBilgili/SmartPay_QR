import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

async function addCashierRole() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    await sql`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cashier';`;
    console.log('user_role updated with cashier');
  } catch(e) {
    console.log('error or already exists user_role', e);
  }
}

addCashierRole();
