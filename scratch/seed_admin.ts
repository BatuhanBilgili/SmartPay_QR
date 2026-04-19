import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';
import { users, restaurants } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });
const db = drizzle(neon(process.env.DATABASE_URL!));

async function run() {
  const allRestaurants = await db.select().from(restaurants).limit(1);
  if (allRestaurants.length === 0) {
    console.log('Hata: Henüz bir restoran kaydı yok!');
    return;
  }
  const restaurant = allRestaurants[0];
  
  // Check if admin already exists
  const existingAdmins = await db.select().from(users).where(eq(users.username, 'admin'));
  if (existingAdmins.length > 0) {
    console.log('Admin hesabı zaten var: Parolası eziliyor...');
    await db.update(users).set({ passwordHash: 'admin123' }).where(eq(users.username, 'admin'));
    console.log('Admin şifresi admin123 yapıldı!');
    return;
  }
  
  await db.insert(users).values({
    restaurantId: restaurant.id,
    name: 'Sistem Yöneticisi',
    username: 'admin',
    passwordHash: 'admin123',
    role: 'owner',
    isActive: true
  });
  
  console.log('Admin hesabı başarıyla oluşturuldu! (Kullanıcı adı: admin / Şifre: admin123)');
}

run();
