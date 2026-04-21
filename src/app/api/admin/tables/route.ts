import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tables, restaurants, tableSessions, orders } from '@/lib/db/schema';
import { eq, ne } from 'drizzle-orm';

async function getRestaurantId() {
  const allRest = await db.select({ id: restaurants.id }).from(restaurants).limit(1);
  return allRest[0]?.id;
}

export async function GET() {
  try {
    // Enriched query: her masa için aktif session + sipariş durumunu da getir
    const allTables = await db.query.tables.findMany({
      orderBy: (t, { asc }) => [asc(t.tableNumber)],
      with: {
        sessions: {
          where: eq(tableSessions.status, 'active'),
          limit: 1,
          with: {
            orders: {
              where: ne(orders.status, 'cancelled'),
            },
          },
        },
      },
    });

    const enrichedTables = allTables.map((table: any) => {
      const activeSession = table.sessions?.[0] || null;
      const activeOrders: any[] = activeSession?.orders || [];

      let orderStatus = 'empty';
      let pendingCount = 0;
      let confirmedCount = 0;
      let totalOrders = 0;
      let totalAmount = 0;

      if (activeOrders.length > 0) {
        totalOrders = activeOrders.length;
        totalAmount = activeOrders.reduce((sum: number, o: any) => sum + parseFloat(o.totalAmount || '0'), 0);
        pendingCount = activeOrders.filter((o: any) => o.status === 'pending').length;
        confirmedCount = activeOrders.filter((o: any) => ['confirmed', 'preparing'].includes(o.status)).length;
        const servedCount = activeOrders.filter((o: any) => o.status === 'served').length;

        // Öncelik: pending (kırmızı zil) > confirmed/preparing (kırmızı zil) > served (yeşil zil)
        if (pendingCount > 0) orderStatus = 'pending';
        else if (confirmedCount > 0) orderStatus = 'confirmed';
        else if (servedCount > 0) orderStatus = 'served';
      }

      return {
        id: table.id,
        tableNumber: table.tableNumber,
        label: table.label,
        capacity: table.capacity,
        status: table.status,
        orderStatus,      // 'empty' | 'pending' | 'confirmed' | 'served'
        sessionId: activeSession?.id || null,
        pendingCount,
        confirmedCount,
        totalOrders,
        totalAmount,
      };
    });

    const restId = await getRestaurantId();
    let restaurant = null;
    if (restId) {
      const [r] = await db.select().from(restaurants).where(eq(restaurants.id, restId));
      restaurant = r;
    }

    return NextResponse.json({
      success: true,
      data: { tables: enrichedTables, restaurant },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const restId = await getRestaurantId();
    if (!restId) throw new Error('Restoran bulunamadı.');

    const body = await request.json();
    const { action, tableNumber, label, name, address } = body;

    if (action === 'table') {
      const [newTable] = await db.insert(tables).values({
        restaurantId: restId,
        tableNumber: parseInt(tableNumber, 10),
        label: label || null,
        capacity: 4,
        status: 'available',
      }).returning();
      return NextResponse.json({ success: true, table: newTable });
    }

    return NextResponse.json({ success: false, error: 'Bilinmeyen işlem.' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { action, id, tableNumber, label, name, address } = body;

    if (action === 'table') {
      if (!id) return NextResponse.json({ success: false, error: 'Masa ID gerekli.' }, { status: 400 });
      const updates: any = {};
      if (tableNumber !== undefined) updates.tableNumber = parseInt(tableNumber, 10);
      if (label !== undefined) updates.label = label;

      const [updated] = await db.update(tables).set(updates).where(eq(tables.id, id)).returning();
      return NextResponse.json({ success: true, table: updated });
    }

    if (action === 'restaurant') {
      const restId = await getRestaurantId();
      if (!restId) return NextResponse.json({ success: false, error: 'Restoran bulunamadı.' }, { status: 400 });
      
      const updates: any = { updatedAt: new Date() };
      if (name !== undefined) updates.name = name;
      if (address !== undefined) updates.address = address;

      const [updated] = await db.update(restaurants).set(updates).where(eq(restaurants.id, restId)).returning();
      return NextResponse.json({ success: true, restaurant: updated });
    }

    return NextResponse.json({ success: false, error: 'Bilinmeyen işlem.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (action === 'table') {
      if (!id) return NextResponse.json({ success: false, error: 'Masa ID gerekli.' }, { status: 400 });
      await db.delete(tables).where(eq(tables.id, id));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Bilinmeyen işlem.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
