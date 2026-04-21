import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orderItems, orders, tableSessions } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';

/**
 * DELETE /api/orders/items/[itemId]
 * Müşterinin kendi sipariş kalemini iptal edebilmesi için Endpoint.
 * Sipariş kalemini siler ve toplam tutarı günceller.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;

    const item = await db.query.orderItems.findFirst({
      where: eq(orderItems.id, itemId),
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Sipariş kalemi bulunamadı' },
        { status: 404 }
      );
    }

    if (item.status === 'served' || item.status === 'cancelled') {
        return NextResponse.json(
            { success: false, error: 'Bu ürün iptal edilemez durumda.' },
            { status: 400 }
        );
    }

    // Kalemi sil
    await db.delete(orderItems).where(eq(orderItems.id, itemId));

    // Siparişin kalan kalemlerini bul ve toplam tutarını yeniden hesapla
    const remainingItems = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, item.orderId),
    });

    const newOrderTotal = remainingItems.reduce(
      (sum: number, i: any) => sum + parseFloat(i.totalPrice || '0'),
      0
    );

    const orderRecord = await db.query.orders.findFirst({
      where: eq(orders.id, item.orderId),
    });

    if (remainingItems.length === 0) {
      // Eğer siparişteki son ürün de silindiyse siparişi komple sil
      await db.delete(orders).where(eq(orders.id, item.orderId));
    } else {
      // Sipariş tutarını güncelle
      await db
        .update(orders)
        .set({ totalAmount: newOrderTotal.toFixed(2), updatedAt: new Date() })
        .where(eq(orders.id, item.orderId));
    }

    // Masa session toplamını (tüm ürünler bazında) güncelle
    if (orderRecord) {
      const allSessionOrders = await db.query.orders.findMany({
        where: and(
          eq(orders.sessionId, orderRecord.sessionId),
          ne(orders.status, 'cancelled')
        ),
      });

      const sessionTotal = allSessionOrders.reduce((sum: number, o: any) => 
        sum + parseFloat(o.totalAmount || '0'), 0
      );

      await db.update(tableSessions)
        .set({ totalAmount: sessionTotal.toFixed(2) })
        .where(eq(tableSessions.id, orderRecord.sessionId));
    }

    return NextResponse.json({ success: true, message: 'Ürün iptal edildi' });
  } catch (error) {
    console.error('Delete order item error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
