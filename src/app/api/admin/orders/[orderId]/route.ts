import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, tableSessions, orderItems } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';

/**
 * DELETE /api/admin/orders/[orderId]
 * Siparişi veritabanından tamamen siler ve masa session toplamını günceller.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // Önce siparişi bul (sessionId lazım)
    const orderRecord = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!orderRecord) {
      return NextResponse.json(
        { success: false, error: 'Sipariş bulunamadı' },
        { status: 404 }
      );
    }

    const sessionId = orderRecord.sessionId;

    // Siparişi sil (order_items cascade silinecektir schema sayesinde)
    await db.delete(orders).where(eq(orders.id, orderId));

    // Masa session toplamını yeniden hesapla
    const allSessionOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.sessionId, sessionId),
        ne(orders.status, 'cancelled')
      ),
    });

    const sessionTotal = allSessionOrders.reduce((sum: number, o: any) => 
      sum + parseFloat(o.totalAmount || '0'), 0
    );

    await db.update(tableSessions)
      .set({ totalAmount: sessionTotal.toFixed(2) })
      .where(eq(tableSessions.id, sessionId));

    console.log(`[Order Delete] Deleted order ${orderId}. New session ${sessionId} total: ${sessionTotal.toFixed(2)}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete order error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
