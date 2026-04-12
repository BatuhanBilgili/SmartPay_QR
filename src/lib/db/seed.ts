import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as dotenv from 'dotenv';
import { nanoid } from 'nanoid';
import {
  restaurants,
  categories,
  menuItems,
  tables,
  tableSessions,
} from './schema';

dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL bulunamadı! .env.local dosyasını kontrol edin.');
  process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle(sql);

async function seed() {
  console.log('🌱 Seed verisi oluşturuluyor...\n');

  // ──────────────────────────────────────────────
  // 1. Restoran
  // ──────────────────────────────────────────────
  console.log('🏪 Restoran oluşturuluyor...');
  const [restaurant] = await db
    .insert(restaurants)
    .values({
      name: 'Lezzet Durağı',
      slug: 'lezzet-duragi',
      description: 'Geleneksel Türk mutfağının modern yorumu. Taze malzemeler, özenli sunum.',
      address: 'Bağdat Caddesi No:42, Kadıköy, İstanbul',
      phone: '+90 216 555 0142',
      currency: 'TRY',
      settings: {
        theme: 'warm',
        serviceFeePercent: 10,
        showPreparationTime: true,
      },
    })
    .returning();
  console.log(`   ✅ ${restaurant.name} (${restaurant.id})`);

  // ──────────────────────────────────────────────
  // 2. Kategoriler
  // ──────────────────────────────────────────────
  console.log('\n📂 Kategoriler oluşturuluyor...');
  const categoryData = [
    { name: 'Başlangıçlar', iconEmoji: '🥗', sortOrder: 1 },
    { name: 'Ana Yemekler', iconEmoji: '🥩', sortOrder: 2 },
    { name: 'Pizzalar', iconEmoji: '🍕', sortOrder: 3 },
    { name: 'Burgerler', iconEmoji: '🍔', sortOrder: 4 },
    { name: 'Makarnalar', iconEmoji: '🍝', sortOrder: 5 },
    { name: 'Tatlılar', iconEmoji: '🍰', sortOrder: 6 },
    { name: 'Soğuk İçecekler', iconEmoji: '🥤', sortOrder: 7 },
    { name: 'Sıcak İçecekler', iconEmoji: '☕', sortOrder: 8 },
  ];

  const insertedCategories = await db
    .insert(categories)
    .values(
      categoryData.map((cat) => ({
        ...cat,
        restaurantId: restaurant.id,
      }))
    )
    .returning();

  insertedCategories.forEach((cat) => {
    console.log(`   ✅ ${cat.iconEmoji} ${cat.name}`);
  });

  // Kategori map (isimle erişim)
  const catMap = Object.fromEntries(
    insertedCategories.map((c) => [c.name, c.id])
  );

  // ──────────────────────────────────────────────
  // 3. Menü Ürünleri
  // ──────────────────────────────────────────────
  console.log('\n🍽️  Menü ürünleri oluşturuluyor...');
  const menuData = [
    // Başlangıçlar
    { categoryId: catMap['Başlangıçlar'], name: 'Mevsim Salatası', description: 'Taze mevsim yeşillikleri, cherry domates, salatalık, havuç, nar ekşili sos', price: '85.00', preparationTime: 8, sortOrder: 1 },
    { categoryId: catMap['Başlangıçlar'], name: 'Mercimek Çorbası', description: 'Geleneksel kırmızı mercimek çorbası, limon ve kruton eşliğinde', price: '65.00', preparationTime: 5, sortOrder: 2 },
    { categoryId: catMap['Başlangıçlar'], name: 'Humus Tabağı', description: 'Ev yapımı humus, zeytinyağı, paprika, sıcak pide ile servis', price: '95.00', preparationTime: 7, sortOrder: 3 },
    { categoryId: catMap['Başlangıçlar'], name: 'Sigara Böreği (4 adet)', description: 'Çıtır yufka içinde beyaz peynir ve maydanoz', price: '90.00', preparationTime: 10, sortOrder: 4 },
    { categoryId: catMap['Başlangıçlar'], name: 'Patates Kızartması', description: 'Çıtır patates kızartması, özel baharat karışımı', price: '70.00', preparationTime: 8, sortOrder: 5 },

    // Ana Yemekler
    { categoryId: catMap['Ana Yemekler'], name: 'Izgara Köfte', description: 'El yapımı dana köfte (200g), pilav, közlenmiş biber ve domates', price: '195.00', preparationTime: 20, sortOrder: 1 },
    { categoryId: catMap['Ana Yemekler'], name: 'Tavuk Şiş', description: 'Marine edilmiş tavuk göğsü şiş, bulgur pilavı ve yeşillik', price: '175.00', preparationTime: 18, sortOrder: 2 },
    { categoryId: catMap['Ana Yemekler'], name: 'Adana Kebap', description: 'Acılı el kıyması kebap, lavaş, közlenmiş sebze garnitür', price: '220.00', preparationTime: 22, sortOrder: 3 },
    { categoryId: catMap['Ana Yemekler'], name: 'Fırın Somon', description: 'Tereyağlı fırın somon fileto (250g), sebze sote ve patates püresi', price: '285.00', preparationTime: 25, sortOrder: 4 },
    { categoryId: catMap['Ana Yemekler'], name: 'Karışık Izgara', description: 'Kuzu pirzola, tavuk kanat, köfte, Adana — 2 kişilik', price: '450.00', preparationTime: 30, sortOrder: 5 },

    // Pizzalar
    { categoryId: catMap['Pizzalar'], name: 'Margarita', description: 'Domates sos, mozzarella, taze fesleğen', price: '155.00', preparationTime: 15, sortOrder: 1 },
    { categoryId: catMap['Pizzalar'], name: 'Karışık Pizza', description: 'Sucuk, mantar, biber, zeytin, mozzarella', price: '185.00', preparationTime: 15, sortOrder: 2 },
    { categoryId: catMap['Pizzalar'], name: 'Pepperoni', description: 'Bol pepperoni, mozzarella, domates sosu', price: '175.00', preparationTime: 15, sortOrder: 3 },

    // Burgerler
    { categoryId: catMap['Burgerler'], name: 'Klasik Burger', description: '180g dana burger, marul, domates, turşu, cheddar, patates kızartması', price: '195.00', preparationTime: 15, sortOrder: 1 },
    { categoryId: catMap['Burgerler'], name: 'Smash Burger', description: 'Double smash patty, karamelize soğan, özel sos, cheddar', price: '220.00', preparationTime: 12, sortOrder: 2 },
    { categoryId: catMap['Burgerler'], name: 'Tavuk Burger', description: 'Çıtır tavuk, coleslaw, ranch sos, patates kızartması', price: '185.00', preparationTime: 14, sortOrder: 3 },

    // Makarnalar
    { categoryId: catMap['Makarnalar'], name: 'Penne Arabiata', description: 'Acılı domates soslu penne, parmesan', price: '145.00', preparationTime: 12, sortOrder: 1 },
    { categoryId: catMap['Makarnalar'], name: 'Fettuccine Alfredo', description: 'Kremalı parmesan sos, tavuk parçaları', price: '165.00', preparationTime: 14, sortOrder: 2 },
    { categoryId: catMap['Makarnalar'], name: 'Spaghetti Bolognese', description: 'Kıymalı domates sos, parmesan rendesi', price: '155.00', preparationTime: 14, sortOrder: 3 },

    // Tatlılar
    { categoryId: catMap['Tatlılar'], name: 'Künefe', description: 'Sıcak servis künefe, antep fıstığı, kaymak', price: '120.00', preparationTime: 15, sortOrder: 1 },
    { categoryId: catMap['Tatlılar'], name: 'Cheesecake', description: 'New York usulü cheesecake, orman meyvesi sos', price: '110.00', preparationTime: 3, sortOrder: 2 },
    { categoryId: catMap['Tatlılar'], name: 'Sütlaç', description: 'Fırın sütlaç, tarçın', price: '75.00', preparationTime: 3, sortOrder: 3 },
    { categoryId: catMap['Tatlılar'], name: 'Brownie & Dondurma', description: 'Sıcak çikolatalı brownie, vanilya dondurma, çikolata sos', price: '115.00', preparationTime: 8, sortOrder: 4 },

    // Soğuk İçecekler
    { categoryId: catMap['Soğuk İçecekler'], name: 'Coca Cola', description: '330ml', price: '45.00', preparationTime: 1, sortOrder: 1 },
    { categoryId: catMap['Soğuk İçecekler'], name: 'Fanta', description: '330ml', price: '45.00', preparationTime: 1, sortOrder: 2 },
    { categoryId: catMap['Soğuk İçecekler'], name: 'Ayran', description: 'Ev yapımı ayran', price: '35.00', preparationTime: 1, sortOrder: 3 },
    { categoryId: catMap['Soğuk İçecekler'], name: 'Taze Limonata', description: 'Taze sıkılmış limonata, nane', price: '55.00', preparationTime: 3, sortOrder: 4 },
    { categoryId: catMap['Soğuk İçecekler'], name: 'Ice Tea Şeftali', description: '330ml', price: '45.00', preparationTime: 1, sortOrder: 5 },
    { categoryId: catMap['Soğuk İçecekler'], name: 'Su', description: '500ml', price: '15.00', preparationTime: 1, sortOrder: 6 },

    // Sıcak İçecekler
    { categoryId: catMap['Sıcak İçecekler'], name: 'Türk Kahvesi', description: 'Geleneksel Türk kahvesi, lokum ikramı', price: '50.00', preparationTime: 5, sortOrder: 1 },
    { categoryId: catMap['Sıcak İçecekler'], name: 'Filtre Kahve', description: 'Taze çekilmiş filtre kahve', price: '55.00', preparationTime: 4, sortOrder: 2 },
    { categoryId: catMap['Sıcak İçecekler'], name: 'Latte', description: 'Espresso, buharda süt', price: '65.00', preparationTime: 4, sortOrder: 3 },
    { categoryId: catMap['Sıcak İçecekler'], name: 'Cappuccino', description: 'Espresso, köpüklü süt, kakao tozu', price: '65.00', preparationTime: 4, sortOrder: 4 },
    { categoryId: catMap['Sıcak İçecekler'], name: 'Çay', description: 'Demlik çay, ince belli bardak', price: '20.00', preparationTime: 3, sortOrder: 5 },
  ];

  const insertedItems = await db
    .insert(menuItems)
    .values(menuData)
    .returning();

  console.log(`   ✅ ${insertedItems.length} ürün eklendi`);

  // ──────────────────────────────────────────────
  // 4. Masalar (10 masa)
  // ──────────────────────────────────────────────
  console.log('\n🪑 Masalar oluşturuluyor...');
  const tableData = [
    { tableNumber: 1, label: 'İç Mekan 1', capacity: 2 },
    { tableNumber: 2, label: 'İç Mekan 2', capacity: 4 },
    { tableNumber: 3, label: 'İç Mekan 3', capacity: 4 },
    { tableNumber: 4, label: 'İç Mekan 4', capacity: 6 },
    { tableNumber: 5, label: 'İç Mekan 5', capacity: 8 },
    { tableNumber: 6, label: 'Bahçe 1', capacity: 4 },
    { tableNumber: 7, label: 'Bahçe 2', capacity: 4 },
    { tableNumber: 8, label: 'Bahçe 3', capacity: 6 },
    { tableNumber: 9, label: 'Teras 1', capacity: 2 },
    { tableNumber: 10, label: 'VIP', capacity: 10 },
  ];

  const insertedTables = await db
    .insert(tables)
    .values(
      tableData.map((t) => ({
        ...t,
        restaurantId: restaurant.id,
        currentToken: nanoid(32),
        tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 saat
      }))
    )
    .returning();

  insertedTables.forEach((t) => {
    console.log(`   ✅ Masa ${t.tableNumber} (${t.label}) — Token: ${t.currentToken}`);
  });

  // ──────────────────────────────────────────────
  // 5. Örnek bir aktif session oluştur (Masa 2)
  // ──────────────────────────────────────────────
  console.log('\n📋 Örnek session oluşturuluyor (Masa 2)...');
  const table2 = insertedTables.find((t) => t.tableNumber === 2)!;
  const [session] = await db
    .insert(tableSessions)
    .values({
      tableId: table2.id,
      token: nanoid(32),
      status: 'active',
      guestCount: 3,
    })
    .returning();
  console.log(`   ✅ Session: ${session.token}`);

  // ──────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log('🎉 Seed verisi başarıyla oluşturuldu!');
  console.log('═'.repeat(50));
  console.log(`\n📊 Özet:`);
  console.log(`   • 1 Restoran: ${restaurant.name}`);
  console.log(`   • ${insertedCategories.length} Kategori`);
  console.log(`   • ${insertedItems.length} Menü Ürünü`);
  console.log(`   • ${insertedTables.length} Masa`);
  console.log(`   • 1 Aktif Session (Masa 2)`);
  console.log(`\n🔗 Test için QR URL:`);
  console.log(`   ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/table/${insertedTables[0].currentToken}`);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Seed hatası:', error);
    process.exit(1);
  });
