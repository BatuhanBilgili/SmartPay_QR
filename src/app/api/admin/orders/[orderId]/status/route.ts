import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, tableSessions } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';

/**
 * PATCH /api/admin/orders/[orderId]/status
 * Sipariş durumunu günceller (pending → confirmed → preparing → served)
 * Body: { status: 'confirmed' | 'preparing' | 'served' | 'cancelled' }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz durum' },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Sipariş bulunamadı' },
        { status: 404 }
      );
    }

    // Eğer iptal edildiyse veya başka bir durum değişikliği olduysa session total'i güncelle
    const allSessionOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.sessionId, updated.sessionId),
        ne(orders.status, 'cancelled')
      ),
    });

    console.log(`[Status Update] Order: ${orderId}, Session: ${updated.sessionId}, New Status: ${status}`);
    console.log(`[Status Update] Non-cancelled orders found: ${allSessionOrders.length}`);

    const sessionTotal = allSessionOrders.reduce((sum: number, o: any) => {
      const val = parseFloat(o.totalAmount || '0');
      console.log(`[Status Update] Adding order ${o.id}: ${val}`);
      return sum + val;
    }, 0);

    console.log(`[Status Update] Resulting Session Total: ${sessionTotal.toFixed(2)}`);

    await db.update(tableSessions)
      .set({ totalAmount: sessionTotal.toFixed(2) })
      .where(eq(tableSessions.id, updated.sessionId));

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update order status error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
