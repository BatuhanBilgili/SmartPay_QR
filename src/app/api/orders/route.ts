import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  orders,
  orderItems,
  menuItems,
  tableSessions,
  sessionParticipants,
} from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * POST /api/orders
 * Yeni sipariş oluşturur
 * 
 * Body:
 * - sessionId: string
 * - participantToken: string (yetki kontrolü)
 * - items: Array<{ menuItemId: string, quantity: number, notes?: string }>
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, participantToken, items } = body;

    // Validasyon
    if (!sessionId || !participantToken || !items?.length) {
      return NextResponse.json(
        { success: false, error: 'sessionId, participantToken ve items zorunludur' },
        { status: 400 }
      );
    }

    // Katılımcı doğrulama
    const participant = await db.query.sessionParticipants.findFirst({
      where: and(
        eq(sessionParticipants.sessionToken, participantToken),
        eq(sessionParticipants.sessionId, sessionId),
        eq(sessionParticipants.isActive, true)
      ),
    });

    if (!participant) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz katılımcı veya session' },
        { status: 403 }
      );
    }

    // Session aktif mi kontrol et
    const session = await db.query.tableSessions.findFirst({
      where: and(
        eq(tableSessions.id, sessionId),
        eq(tableSessions.status, 'active')
      ),
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Bu session artık aktif değil' },
        { status: 400 }
      );
    }

    // Menü ürünlerini çek ve fiyat doğrulaması yap
    const menuItemIds = items.map((item: { menuItemId: string }) => item.menuItemId);
    const menuItemsData = await Promise.all(
      menuItemIds.map((id: string) =>
        db.query.menuItems.findFirst({
          where: and(
            eq(menuItems.id, id),
            eq(menuItems.isAvailable, true)
          ),
        })
      )
    );

    // Tüm ürünlerin mevcut olup olmadığını kontrol et
    const unavailableItems = items.filter(
      (_: unknown, index: number) => !menuItemsData[index]
    );
    if (unavailableItems.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Bazı ürünler artık mevcut değil' },
        { status: 400 }
      );
    }

    // Toplam tutarı hesapla
    let totalAmount = 0;
    const orderItemsData = items.map(
      (item: { menuItemId: string; quantity: number; notes?: string }, index: number) => {
        const menuItem = menuItemsData[index]!;
        const unitPrice = parseFloat(menuItem.price);
        const itemTotal = unitPrice * item.quantity;
        totalAmount += itemTotal;

        return {
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: unitPrice.toFixed(2),
          totalPrice: itemTotal.toFixed(2),
          notes: item.notes || null,
          status: 'confirmed' as const,
        };
      }
    );

    // Sipariş oluştur
    const [newOrder] = await db
      .insert(orders)
      .values({
        sessionId,
        participantId: participant.id,
        status: 'confirmed',
        totalAmount: totalAmount.toFixed(2),
      })
      .returning();

    // Sipariş kalemlerini ekle
    const insertedItems = await db
      .insert(orderItems)
      .values(
        orderItemsData.map((item: {
          menuItemId: string;
          quantity: number;
          unitPrice: string;
          totalPrice: string;
          notes: string | null;
          status: 'confirmed';
        }) => ({
          ...item,
          orderId: newOrder.id,
        }))
      )
      .returning();

    // Session toplam tutarını güncelle
    await db
      .update(tableSessions)
      .set({
        totalAmount: sql`${tableSessions.totalAmount}::numeric + ${totalAmount.toFixed(2)}::numeric`,
      })
      .where(eq(tableSessions.id, sessionId));

    return NextResponse.json({
      success: true,
      data: {
        order: {
          ...newOrder,
          items: insertedItems,
        },
      },
      message: 'Sipariş başarıyla oluşturuldu',
    });
  } catch (error) {
    console.error('Order create error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders?sessionId=xxx
 * Bir session'ın tüm siparişlerini döndürür
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId parametresi zorunludur' },
        { status: 400 }
      );
    }

    const sessionOrders = await db.query.orders.findMany({
      where: eq(orders.sessionId, sessionId),
      with: {
        participant: true,
        items: {
          with: {
            menuItem: true,
            claims: {
              with: {
                participant: true,
              },
            },
          },
        },
      },
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    });

    return NextResponse.json({
      success: true,
      data: sessionOrders,
    });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
