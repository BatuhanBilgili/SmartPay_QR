import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tableSessions, orders, orderItems, menuItems, sessionParticipants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/orders/session/[sessionId]
 * Session'a ait tüm siparişleri, kalemlerini ve katılımcı bilgilerini döndürür.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const session = await db.query.tableSessions.findFirst({
      where: eq(tableSessions.id, sessionId),
      with: {
        orders: {
          orderBy: (orders, { desc }) => [desc(orders.createdAt)],
          with: {
            participant: true,
            items: {
              with: {
                menuItem: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session bulunamadı' },
        { status: 404 }
      );
    }

    // Map to a clean format
    const mappedOrders = session.orders.map((order: any) => ({
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      participantId: order.participantId,
      participantName: order.participant?.displayName || null,
      participantEmoji: order.participant?.avatarEmoji || null,
      items: order.items.map((item: any) => ({
        id: item.id,
        name: item.menuItem?.name || 'Bilinmeyen Ürün',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        status: item.status,
      })),
    }));

    return NextResponse.json({ success: true, data: mappedOrders });
  } catch (error) {
    console.error('Fetch session orders error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
