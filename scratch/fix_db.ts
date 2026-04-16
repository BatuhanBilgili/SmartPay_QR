import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function fix() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    console.log('Adding max_quantity column...');
    await sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS max_quantity integer`;
    
    console.log('Removing old columns (optional but cleanup)...');
    // await sql`ALTER TABLE menu_items DROP COLUMN IF EXISTS preparation_time`;
    // await sql`ALTER TABLE menu_items DROP COLUMN IF EXISTS allergens`;
    
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
  }
}

fix();
