import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orderItems, orders, tableSessions } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';

/**
 * DELETE /api/admin/orders/items/[itemId]
 * Sipariş kalemini siler ve toplam tutarı günceller.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;

    // Önce kalemi bul (orderId lazım)
    const item = await db.query.orderItems.findFirst({
      where: eq(orderItems.id, itemId),
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Sipariş kalemi bulunamadı' },
        { status: 404 }
      );
    }

    // Kalemi sil
    await db.delete(orderItems).where(eq(orderItems.id, itemId));

    // Siparişin toplam tutarını yeniden hesapla
    const remainingItems = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, item.orderId),
    });

    const newOrderTotal = remainingItems.reduce(
      (sum: number, i: any) => sum + parseFloat(i.totalPrice || '0'),
      0
    );

    // Siparişi güncelle veya sil
    const orderRecord = await db.query.orders.findFirst({
      where: eq(orders.id, item.orderId),
    });

    if (remainingItems.length === 0) {
      await db.delete(orders).where(eq(orders.id, item.orderId));
    } else {
      await db
        .update(orders)
        .set({ totalAmount: newOrderTotal.toFixed(2), updatedAt: new Date() })
        .where(eq(orders.id, item.orderId));
    }

    // Masa session toplamını güncelle
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete order item error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/orders/items/[itemId]
 * Sipariş kaleminin adetini günceller.
 * Body: { quantity: number }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await request.json();
    const { quantity, status } = body;
    const updateData: any = { updatedAt: new Date() };

    if (quantity !== undefined) {
      if (quantity < 1) {
        return NextResponse.json({ success: false, error: 'Geçersiz adet' }, { status: 400 });
      }
      updateData.quantity = quantity;
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    const item = await db.query.orderItems.findFirst({
      where: eq(orderItems.id, itemId),
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Sipariş kalemi bulunamadı' },
        { status: 404 }
      );
    }

    if (quantity !== undefined) {
      const unitPrice = parseFloat(item.unitPrice);
      updateData.totalPrice = (unitPrice * quantity).toFixed(2);
    }

    await db
      .update(orderItems)
      .set(updateData)
      .where(eq(orderItems.id, itemId));

    // Eğer miktar güncellendiyse sipariş toplamını yenile
    if (quantity !== undefined) {
      const allItems = await db.query.orderItems.findMany({
        where: eq(orderItems.orderId, item.orderId),
      });

      const newOrderTotal = allItems.reduce((sum: number, i: any) => {
        if (i.id === itemId) return sum + parseFloat(updateData.totalPrice);
        return sum + parseFloat(i.totalPrice || '0');
      }, 0);

      await db
        .update(orders)
        .set({ totalAmount: newOrderTotal.toFixed(2), updatedAt: new Date() })
        .where(eq(orders.id, item.orderId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update order item error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
