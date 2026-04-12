import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tables, tableSessions, restaurants, categories, menuItems } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/tables/[token]
 * QR koddan gelen token ile masayı ve restoranın menüsünü döndürür
 * Bu endpoint "güvenli giriş noktası" — token yoksa veya süresi dolmuşsa erişim reddedilir
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Token ile masayı bul
    const table = await db.query.tables.findFirst({
      where: and(
        eq(tables.currentToken, token),
      ),
      with: {
        restaurant: {
          with: {
            categories: {
              where: eq(categories.isActive, true),
              orderBy: (categories, { asc }) => [asc(categories.sortOrder)],
              with: {
                menuItems: {
                  where: eq(menuItems.isAvailable, true),
                  orderBy: (menuItems, { asc }) => [asc(menuItems.sortOrder)],
                },
              },
            },
          },
        },
        sessions: {
          where: eq(tableSessions.status, 'active'),
          limit: 1,
        },
      },
    });

    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz veya süresi dolmuş QR kod' },
        { status: 404 }
      );
    }

    // Token süresi kontrolü
    if (table.tokenExpiresAt && new Date(table.tokenExpiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'QR kodun süresi dolmuş. Lütfen garsondan yeni QR kod isteyin.' },
        { status: 410 }
      );
    }

    // Aktif session varsa döndür
    const activeSession = table.sessions?.[0] || null;

    return NextResponse.json({
      success: true,
      data: {
        table: {
          id: table.id,
          tableNumber: table.tableNumber,
          label: table.label,
          capacity: table.capacity,
          status: table.status,
        },
        restaurant: table.restaurant,
        activeSession,
      },
    });
  } catch (error) {
    console.error('Table fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
