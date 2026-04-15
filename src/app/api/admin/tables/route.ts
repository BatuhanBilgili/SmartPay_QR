import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tables, tableSessions, orders, orderItems } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * GET /api/admin/tables
 * Restoranın tüm masalarını, aktif session ve bekleyen sipariş bilgileriyle döndürür.
 */
export async function GET() {
  try {
    // Tüm masaları getir
    const allTables = await db.query.tables.findMany({
      orderBy: (tables, { asc }) => [asc(tables.tableNumber)],
      with: {
        sessions: {
          where: eq(tableSessions.status, 'active'),
          limit: 1,
          with: {
            orders: {
              with: {
                items: true,
              },
            },
          },
        },
      },
    });

    // Her masa için durum bilgisi hesapla
    const mappedTables = allTables.map((table: any) => {
      const activeSession = table.sessions?.[0] || null;
      const allOrders = activeSession?.orders || [];
      
      const pendingOrders = allOrders.filter((o: any) => o.status === 'pending');
      const confirmedOrders = allOrders.filter((o: any) => 
        o.status === 'confirmed' || o.status === 'preparing'
      );
      const servedOrders = allOrders.filter((o: any) => o.status === 'served');

      let tableStatus: 'empty' | 'pending' | 'confirmed' | 'served' = 'empty';
      if (pendingOrders.length > 0) tableStatus = 'pending';
      else if (confirmedOrders.length > 0) tableStatus = 'confirmed';
      else if (servedOrders.length > 0) tableStatus = 'served';

      const totalAmount = allOrders.reduce((sum: number, o: any) => 
        sum + parseFloat(o.totalAmount || '0'), 0
      );

      return {
        id: table.id,
        tableNumber: table.tableNumber,
        label: table.label,
        capacity: table.capacity,
        status: table.status,
        orderStatus: tableStatus,
        sessionId: activeSession?.id || null,
        pendingCount: pendingOrders.length,
        confirmedCount: confirmedOrders.length,
        totalOrders: allOrders.length,
        totalAmount,
      };
    });

    return NextResponse.json({ success: true, data: mappedTables });
  } catch (error) {
    console.error('Fetch admin tables error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
