import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

/**
 * Neon HTTP driver ile Drizzle client singleton
 * 
 * Not: neon-http driver HTTP üzerinden çalışır ve serverless ortamlar için idealdir.
 * Transaction desteği için neon-serverless (WebSocket) driver'ı kullanılabilir
 * ama çoğu durum için HTTP yeterlidir.
 * 
 * Drizzle'ın `transaction()` metodu neon-http'de de desteklenir (Neon'un
 * transaction API'si üzerinden).
 */

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    '❌ DATABASE_URL bulunamadı!\n' +
    '📝 .env.local dosyasını kontrol edin.\n' +
    '🔗 Neon.tech → Project → Connection Details → Connection String'
  );
}

const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });
