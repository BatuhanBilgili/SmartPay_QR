import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';
import { tables } from './src/lib/db/schema';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });
const db = drizzle(neon(process.env.DATABASE_URL!));

async function run() {
  const allTables = await db.select().from(tables);
  
  // Collect existing tokens to avoid conflicts
  const usedTokens = new Set(allTables.map(t => t.currentToken).filter(Boolean));

  for (const tbl of allTables) {
    let permanentToken = `table-${tbl.tableNumber}`;
    
    // If this table already has the right token, skip
    if (tbl.currentToken === permanentToken) {
      console.log(`Masa ${tbl.tableNumber}: ✓ zaten atanmış → http://localhost:3000/join/${permanentToken}`);
      continue;
    }

    // If another table already uses this token, add a suffix
    if (usedTokens.has(permanentToken)) {
      permanentToken = `table-${tbl.tableNumber}-${tbl.id.slice(0,6)}`;
    }

    try {
      await db.update(tables).set({
        currentToken: permanentToken,
        tokenExpiresAt: null,
      }).where(eq(tables.id, tbl.id));
      
      usedTokens.add(permanentToken);
      console.log(`Masa ${tbl.tableNumber}: http://localhost:3000/join/${permanentToken}`);
    } catch (err: any) {
      console.log(`Masa ${tbl.tableNumber}: ⚠ Hata — ${err.message}`);
    }
  }

  console.log('\n✅ Tüm masalara kalıcı token atandı.');
}

run();
