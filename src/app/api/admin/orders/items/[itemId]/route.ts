import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orderItems, orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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

    const newTotal = remainingItems.reduce(
      (sum: number, i: any) => sum + parseFloat(i.totalPrice || '0'),
      0
    );

    await db
      .update(orders)
      .set({ totalAmount: newTotal.toFixed(2), updatedAt: new Date() })
      .where(eq(orders.id, item.orderId));

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
    const { quantity } = body;

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz adet' },
        { status: 400 }
      );
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

    const unitPrice = parseFloat(item.unitPrice);
    const newTotalPrice = (unitPrice * quantity).toFixed(2);

    await db
      .update(orderItems)
      .set({ quantity, totalPrice: newTotalPrice })
      .where(eq(orderItems.id, itemId));

    // Siparişin toplam tutarını yeniden hesapla
    const allItems = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, item.orderId),
    });

    // Güncellenmiş kalemi hesaba kat
    const newOrderTotal = allItems.reduce((sum: number, i: any) => {
      if (i.id === itemId) return sum + parseFloat(newTotalPrice);
      return sum + parseFloat(i.totalPrice || '0');
    }, 0);

    await db
      .update(orders)
      .set({ totalAmount: newOrderTotal.toFixed(2), updatedAt: new Date() })
      .where(eq(orders.id, item.orderId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update order item error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
