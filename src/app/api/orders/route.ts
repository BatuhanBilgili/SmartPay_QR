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
      with: {
        category: true, // Fetch category to determine if it's a drink
      }
    });

    const menuMap = new Map(dbMenuItems.map((m) => [m.id, m]));

    // 3. Calculate total amount & Split Items
    let sessionTotalAddition = 0;
    const foodItemsPayload: any[] = [];
    const drinkItemsPayload: any[] = [];

    let foodTotal = 0;
    let drinkTotal = 0;
    
    for (const inputItem of items) {
      const dbMenu = menuMap.get(inputItem.menuItemId);
      if (!dbMenu) continue;
      
      const unitPrice = parseFloat(dbMenu.price as string);
      const quantity = parseInt(inputItem.quantity, 10);
      
      if (isNaN(quantity) || quantity <= 0) continue;

      const itemTotal = unitPrice * quantity;
      sessionTotalAddition += itemTotal;

      const isDrink = dbMenu.category?.name.toLowerCase().includes('içecek') || dbMenu.category?.name.toLowerCase().includes('i̇çecek');

      const payloadItem = {
        menuItemId: dbMenu.id,
        quantity,
        unitPrice: unitPrice.toFixed(2),
        totalPrice: itemTotal.toFixed(2),
        notes: inputItem.notes 
          ? `${customerName ? `[${customerName}] ` : ''}${inputItem.notes}` 
          : (customerName ? `[${customerName}]` : null),
      };

      if (isDrink) {
        drinkItemsPayload.push(payloadItem);
        drinkTotal += itemTotal;
      } else {
        foodItemsPayload.push(payloadItem);
        foodTotal += itemTotal;
      }
    }

    if (foodItemsPayload.length === 0 && drinkItemsPayload.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sipariş edilebilir geçerli ürün yok.' },
        { status: 400 }
      );
    }

    // 4. Create separate orders based on type
    const resultingOrders = [];

    // 4a. Create Food Order (goes to kitchen)
    if (foodItemsPayload.length > 0) {
      const [newFoodOrder] = await db
        .insert(orders)
        .values({
          sessionId: activeSession.id,
          participantId: participantId || null,
          totalAmount: foodTotal.toFixed(2),
          status: 'confirmed', // Yiyecekler doğrudan mutfağa gider (confirmed/preparing)
        })
        .returning();

      const finalFoodItemsData = foodItemsPayload.map((oi) => ({
        ...oi,
        orderId: newFoodOrder.id,
        status: 'confirmed', 
      }));

      await db.insert(orderItems).values(finalFoodItemsData);
      resultingOrders.push(newFoodOrder);
    }

    // 4b. Create Drink Order (goes directly to waiter as ready)
    if (drinkItemsPayload.length > 0) {
      const [newDrinkOrder] = await db
        .insert(orders)
        .values({
          sessionId: activeSession.id,
          participantId: participantId || null,
          totalAmount: drinkTotal.toFixed(2),
          status: 'ready', // İçecekler anında garsonun 'Teslim Bekleyen' ekranına düşer
        })
        .returning();

      const finalDrinkItemsData = drinkItemsPayload.map((oi) => ({
        ...oi,
        orderId: newDrinkOrder.id,
        status: 'ready', 
      }));

      await db.insert(orderItems).values(finalDrinkItemsData);
      resultingOrders.push(newDrinkOrder);
    }
    
    // 6. Update session total amount 
    const updatedTotal = parseFloat(activeSession.totalAmount as string) + sessionTotalAddition;
    await db.update(tableSessions)
      .set({ totalAmount: updatedTotal.toFixed(2) })
      .where(eq(tableSessions.id, activeSession.id));

    return NextResponse.json({ success: true, orders: resultingOrders });
  } catch (error: any) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Sipariş işlenirken hata oluştu.' },
      { status: 500 }
    );
  }
}
