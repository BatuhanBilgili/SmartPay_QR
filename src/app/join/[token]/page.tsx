import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { tables, tableSessions, restaurants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { nanoid } from 'nanoid';
import JoinRedirect from './JoinRedirect';

/**
 * /join/[token] — QR koddan gelen giriş noktası
 * Token'ı doğrular, cookie set etmek için bir server action tetikler 
 * ve /menu'ye yönlendirir.
 * 
 * URL'de token asla görünmez çünkü anında yönlendirme yapılır.
 */
export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // 1. Validate token
  let table = await db.query.tables.findFirst({
    where: eq(tables.currentToken, token),
    with: {
      restaurant: true,
      sessions: {
        where: eq(tableSessions.status, 'active'),
        limit: 1,
      },
    },
  });

  // 1.1. If table not found, check if token is numeric and auto-create (Development/Testing feature)
  if (!table && /^\d+$/.test(token)) {
    const allRest = await db.select().from(restaurants).limit(1);
    if (allRest.length > 0) {
      const rest = allRest[0];
      const tableNumber = parseInt(token, 10);
      
      // Create new table
      const [newTable] = await db
        .insert(tables)
        .values({
          restaurantId: rest.id,
          tableNumber: tableNumber,
          label: `Otomatik Masa ${tableNumber}`,
          currentToken: token, // Token is the number itself for easy testing
          tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          status: 'available',
        })
        .returning();
      
      // Re-fetch or simulate the table object
      table = {
        ...newTable,
        restaurant: rest,
        sessions: [],
      } as any;
    }
  }

  if (!table) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 20 }}>
        <div style={{ textAlign: 'center', background: '#fff', padding: 30, borderRadius: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 22, marginBottom: 10, fontWeight: 700 }}>Geçersiz QR Kod</h1>
          <p style={{ color: '#6B6B6B', fontSize: 14 }}>Bu QR kod geçersiz veya süresi dolmuş. Lütfen garsondan yeni bir QR kod isteyin.</p>
        </div>
      </div>
    );
  }

  if (table.tokenExpiresAt && new Date(table.tokenExpiresAt) < new Date()) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 20 }}>
        <div style={{ textAlign: 'center', background: '#fff', padding: 30, borderRadius: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
          <h1 style={{ fontSize: 22, marginBottom: 10, fontWeight: 700 }}>Süresi Dolmuş</h1>
          <p style={{ color: '#6B6B6B', fontSize: 14 }}>Bu QR kodun süresi dolmuş. Güvenlik sebebiyle kodlar periyodik olarak yenilenmektedir.</p>
        </div>
      </div>
    );
  }

  // 2. Ensure active session exists
  let activeSession = table.sessions?.[0] || null;
  if (!activeSession) {
    const [newSession] = await db
      .insert(tableSessions)
      .values({
        tableId: table.id,
        token: nanoid(32),
        status: 'active',
        guestCount: 0,
      })
      .returning();
    activeSession = newSession;

    // Mark table as occupied
    await db
      .update(tables)
      .set({ status: 'occupied' })
      .where(eq(tables.id, table.id));
  }

  // 3. Prepare cookie data
  const cookieData = {
    tableId: table.id,
    tableToken: token,
    tableNumber: table.tableNumber,
    tableLabel: table.label,
    restaurantId: table.restaurant.id,
    restaurantName: table.restaurant.name,
    restaurantSlug: table.restaurant.slug,
    sessionId: activeSession.id,
  };

  // Use a client component that calls a server action to set the cookie and redirect
  return <JoinRedirect cookieData={JSON.stringify(cookieData)} />;
}
