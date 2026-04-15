import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';
import { tables, tableSessions } from './src/lib/db/schema';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });
const db = drizzle(neon(process.env.DATABASE_URL!));

async function run() {
  const allTables = await db.select().from(tables).limit(1);
  if (allTables.length === 0) return;
  const tbl = allTables[0];
  
  // Make token valid for 1 hour
  const tempToken = tbl.currentToken || 'temp-qr-token-' + Math.floor(Math.random()*10000);
  const future = new Date(Date.now() + 60 * 60 * 1000); 
  await db.update(tables).set({ currentToken: tempToken, tokenExpiresAt: future }).where(eq(tables.id, tbl.id));
  
  // ensure active session exists
  const sessions = await db.select().from(tableSessions).where(eq(tableSessions.tableId, tbl.id));
  let activeSession = sessions.find((s: any) => s.status === 'active');
  if (!activeSession) {
     await db.insert(tableSessions).values({
       tableId: tbl.id,
       token: 'session-token-' + Math.floor(Math.random()*10000),
       status: 'active',
     });
  }
  console.log('http://localhost:3000/join/' + tempToken);
}
run();
