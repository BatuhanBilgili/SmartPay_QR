import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, tableSessions, orderItems, tables } from '@/lib/db/schema';
import { eq, and, inArray, asc, ne } from 'drizzle-orm';

/**
 * GET /api/admin/kitchen/orders
 * Mutfağın hazırlaması gereken tüm ürünleri (bilet bazlı) döndürür.
 * Status: 'confirmed' or 'preparing'
 */
export async function GET() {
  try {
    const kitchenOrders = await db.query.orders.findMany({
      where: inArray(orders.status, ['confirmed', 'preparing']),
      orderBy: (orders, { asc }) => [asc(orders.createdAt)],
      with: {
        session: {
          with: {
            table: true,
          },
        },
        items: {
          with: {
            menuItem: true,
          },
          // Sadece henüz servis edilmemiş kalemleri getirsek de olur ama bilet bazlı göstermek daha iyi
          where: ne(orderItems.status, 'served'), 
        },
      },
    });

    // Veriyi bilet (ticket) formatına getir
    const tickets = kitchenOrders.map((order: any) => ({
      id: order.id,
      orderNumber: order.id.slice(-4).toUpperCase(),
      tableNumber: order.session?.table?.tableNumber || '?',
      tableLabel: order.session?.table?.label || '',
      createdAt: order.createdAt,
      status: order.status,
      items: order.items.map((item: any) => ({
        id: item.id,
        name: item.menuItem?.name || 'Bilinmeyen',
        quantity: item.quantity,
        status: item.status,
        notes: item.notes,
      })),
    }));

    return NextResponse.json({ success: true, data: tickets });
  } catch (error) {
    console.error('Fetch kitchen orders error:', error);
    return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 });
  }
}
