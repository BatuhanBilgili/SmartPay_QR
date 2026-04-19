import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tables, tableSessions, orders, orderItems, menuItems } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tableId, sessionId, participantId, customerName, items } = body;

    if (!tableId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Eksik veri gönderildi.' },
        { status: 400 }
      );
    }

    // 1. Resolve Active Session
    let activeSession: any = null;
    
    if (sessionId) {
      // Use the provided sessionId
      activeSession = await db.query.tableSessions.findFirst({
        where: eq(tableSessions.id, sessionId),
      });
    }
    
    if (!activeSession) {
      // Find or create active session for this table
      activeSession = await db.query.tableSessions.findFirst({
        where: eq(tableSessions.tableId, tableId),
      });
      
      if (!activeSession) {
        const [newSession] = await db
          .insert(tableSessions)
          .values({
            tableId,
            token: nanoid(32),
            status: 'active',
            guestCount: 1,
          })
          .returning();
        activeSession = newSession;
      }
    }

    // 2. Gather Menu Items to calculate prices securely on backend
    const menuItemIds = items.map((i: any) => i.menuItemId);
    const dbMenuItems = await db.query.menuItems.findMany({
      where: inArray(menuItems.id, menuItemIds),
    });

    const menuMap = new Map(dbMenuItems.map((m) => [m.id, m]));

    // 3. Calculate total amount
    let totalAmount = 0;
    const orderItemsPayload: any[] = [];
    
    for (const inputItem of items) {
      const dbMenu = menuMap.get(inputItem.menuItemId);
      if (!dbMenu) {
        return NextResponse.json(
          { success: false, error: 'Sepetteki bazı ürünler bulunamadı.' },
          { status: 400 }
        );
      }
      
      const unitPrice = parseFloat(dbMenu.price as string);
      const quantity = parseInt(inputItem.quantity, 10);
      
      if (isNaN(quantity) || quantity <= 0) {
          continue;
      }

      const itemTotal = unitPrice * quantity;
      totalAmount += itemTotal;

      orderItemsPayload.push({
        menuItemId: dbMenu.id,
        quantity,
        unitPrice: unitPrice.toFixed(2),
        totalPrice: itemTotal.toFixed(2),
        notes: inputItem.notes 
          ? `${customerName ? `[${customerName}] ` : ''}${inputItem.notes}` 
          : (customerName ? `[${customerName}]` : null),
      });
    }

    if (orderItemsPayload.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sipariş edilebilir geçerli ürün yok.' },
        { status: 400 }
      );
    }

    // 4. Create order with participantId
    const [newOrder] = await db
      .insert(orders)
      .values({
        sessionId: activeSession.id,
        participantId: participantId || null,
        totalAmount: totalAmount.toFixed(2),
        status: 'preparing',
      })
      .returning();

    // 5. Create order items
    const finalItemsData = orderItemsPayload.map((oi) => ({
      ...oi,
      orderId: newOrder.id,
      status: 'preparing',
    }));

    await db.insert(orderItems).values(finalItemsData);
    
    // 6. Update session total amount 
    const updatedTotal = parseFloat(activeSession.totalAmount as string) + totalAmount;
    await db.update(tableSessions)
      .set({ totalAmount: updatedTotal.toFixed(2) })
      .where(eq(tableSessions.id, activeSession.id));

    return NextResponse.json({ success: true, order: newOrder });
  } catch (error: any) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Sipariş işlenirken hata oluştu.' },
      { status: 500 }
    );
  }
}
