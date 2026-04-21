import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';

/**
 * GET /api/admin/waiter/ready-orders
 * Mutfak tarafından hazırlanan (status = 'served') ve garsonun masaya
 * iletmesi gereken siparişleri döndürür.
 * Son 6 saat içindeki siparişler filtrelenir (eski birikmiş kayıtlar hariç).
 */
export async function GET() {
  try {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    const readyOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.status, 'served'),
        gt(orders.updatedAt, sixHoursAgo)
      ),
      orderBy: (o, { asc }) => [asc(o.updatedAt)],
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
        },
      },
    });

    const tickets = readyOrders.map((order: any) => ({
      id: order.id,
      tableNumber: order.session?.table?.tableNumber ?? '?',
      tableLabel: order.session?.table?.label ?? '',
      tableId: order.session?.table?.id ?? null,
      updatedAt: order.updatedAt,
      items: order.items.map((item: any) => ({
        id: item.id,
        name: item.menuItem?.name ?? 'Bilinmeyen',
        quantity: item.quantity,
      })),
    }));

    return NextResponse.json({ success: true, data: tickets });
  } catch (error) {
    console.error('Fetch ready orders error:', error);
    return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 });
  }
}
