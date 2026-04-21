import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tables, tableSessions, orders, orderItems, menuItems, categories } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * GET /api/admin/tables/[tableId]/orders
 * Masanın aktif session'ındaki siparişleri ve menü verilerini döndürür.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId } = await params;

    // Masa bilgisi
    const table = await db.query.tables.findFirst({
      where: eq(tables.id, tableId),
    });

    if (!table) {
      return NextResponse.json({ success: false, error: 'Masa bulunamadı' }, { status: 404 });
    }

    // Aktif session
    const activeSession = await db.query.tableSessions.findFirst({
      where: and(
        eq(tableSessions.tableId, tableId),
        eq(tableSessions.status, 'active')
      ),
      with: {
        orders: {
          orderBy: (orders, { desc }) => [desc(orders.createdAt)],
          with: {
            items: {
              with: {
                menuItem: {
                  with: { category: true },
                },
              },
            },
          },
        },
      },
    });

    // Menü kategorileri ve ürünler
    const menuCategories = await db.query.categories.findMany({
      where: eq(categories.restaurantId, table.restaurantId),
      orderBy: (categories, { asc }) => [asc(categories.sortOrder)],
      with: {
        menuItems: {
          where: eq(menuItems.isAvailable, true),
          orderBy: (menuItems, { asc }) => [asc(menuItems.sortOrder)],
        },
      },
    });

    // Sipariş verisini düzenle
    const mappedOrders = activeSession?.orders.map((order: any) => ({
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      items: order.items.map((item: any) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.menuItem?.name || 'Bilinmeyen',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        status: item.status,
        isDrink: item.menuItem?.category?.name?.toLowerCase().includes('içecek') || item.menuItem?.category?.name?.toLowerCase().includes('i̇çecek') || false,
      })),
    })) || [];

    return NextResponse.json({
      success: true,
      data: {
        table: {
          id: table.id,
          tableNumber: table.tableNumber,
          label: table.label,
          capacity: table.capacity,
        },
        sessionId: activeSession?.id || null,
        totalAmount: activeSession?.totalAmount || '0.00',
        orders: mappedOrders,
        menu: menuCategories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          iconEmoji: cat.iconEmoji,
          items: cat.menuItems.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
          })),
        })),
      },
    });
  } catch (error) {
    console.error('Fetch table orders error:', error);
    return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 });
  }
}

/**
 * POST /api/admin/tables/[tableId]/orders
 * Garsonun masaya ürün eklemesi — yeni sipariş veya mevcut siparişe ekleme.
 * Body: { items: [{ menuItemId, quantity }] }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId } = await params;
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Ürün listesi boş' }, { status: 400 });
    }

    // Masa kontrolü
    const table = await db.query.tables.findFirst({
      where: eq(tables.id, tableId),
    });

    if (!table) {
      return NextResponse.json({ success: false, error: 'Masa bulunamadı' }, { status: 404 });
    }

    // Aktif session bul veya oluştur
    let activeSession = await db.query.tableSessions.findFirst({
      where: and(
        eq(tableSessions.tableId, tableId),
        eq(tableSessions.status, 'active')
      ),
    });

    if (!activeSession) {
      const [newSession] = await db.insert(tableSessions).values({
        tableId,
        token: nanoid(32),
        status: 'active',
        guestCount: 1,
      }).returning();
      activeSession = newSession;
    }

    // Menü ürün fiyatlarını çek
    const menuItemIds = items.map((i: any) => i.menuItemId);
    const menuItemsData = await db.query.menuItems.findMany({
      where: (mi, { inArray }) => inArray(mi.id, menuItemIds),
    });

    const priceMap = new Map(menuItemsData.map((mi: any) => [mi.id, parseFloat(mi.price)]));

    // Toplam tutarı hesapla
    let totalAmount = 0;
    const orderItemsToInsert = items.map((item: any) => {
      const unitPrice = priceMap.get(item.menuItemId) || 0;
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;
      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: unitPrice.toFixed(2),
        totalPrice: totalPrice.toFixed(2),
      };
    });

    // Yeni sipariş oluştur
    const [newOrder] = await db.insert(orders).values({
      sessionId: activeSession.id,
      status: 'pending',
      totalAmount: totalAmount.toFixed(2),
    }).returning();

    // Sipariş kalemlerini ekle
    await db.insert(orderItems).values(
      orderItemsToInsert.map((item: any) => ({
        ...item,
        orderId: newOrder.id,
      }))
    );

    // Session toplam tutarını güncelle
    const allSessionOrders = await db.query.orders.findMany({
      where: eq(orders.sessionId, activeSession.id),
    });
    const sessionTotal = allSessionOrders.reduce((sum: number, o: any) =>
      sum + parseFloat(o.totalAmount || '0'), 0
    );
    await db.update(tableSessions)
      .set({ totalAmount: sessionTotal.toFixed(2) })
      .where(eq(tableSessions.id, activeSession.id));

    return NextResponse.json({ success: true, data: { orderId: newOrder.id } });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 });
  }
}
