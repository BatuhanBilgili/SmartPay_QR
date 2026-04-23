import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tables, tableSessions, orders } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const allTables = await db.query.tables.findMany({
      orderBy: (tables, { asc }) => [asc(tables.tableNumber)],
    });

    const tablesData = await Promise.all(
      allTables.map(async (table) => {
        const activeSession = await db.query.tableSessions.findFirst({
          where: eq(tableSessions.tableId, table.id),
          orderBy: [desc(tableSessions.createdAt)],
        });

        // If the most recent session is active, get its orders
        if (activeSession && activeSession.status === 'active') {
          const sessionOrders = await db.query.orders.findMany({
            where: eq(orders.sessionId, activeSession.id),
            with: {
              items: {
                with: {
                  menuItem: true,
                },
              },
            },
          });
          
          // Compute true total from active orders (excluding cancelled)
          const validOrders = sessionOrders.filter((o: any) => o.status !== 'cancelled');

          return {
            ...table,
            session: activeSession,
            orders: validOrders,
          };
        }

        return {
          ...table,
          session: null,
          orders: [],
        };
      })
    );

    return NextResponse.json({ success: true, data: tablesData });
  } catch (error) {
    console.error('Fetch cashier tables error:', error);
    return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 });
  }
}
