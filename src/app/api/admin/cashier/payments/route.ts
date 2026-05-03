import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tableSessions, payments, tables, sessionParticipants, orderItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, amount, method, paymentType = 'full', items = [] } = body as {
      sessionId: string;
      amount: number;
      method: 'cash' | 'credit_card';
      paymentType: 'full' | 'equal' | 'itemized';
      items: { id: string; paidQuantity: number }[];
    };

    if (!sessionId || !amount || !method) {
      return NextResponse.json({ success: false, error: 'Eksik veri gönderildi.' }, { status: 400 });
    }

    const session = await db.query.tableSessions.findFirst({
      where: eq(tableSessions.id, sessionId),
      with: {
        table: true,
      },
    });

    if (!session) {
      return NextResponse.json({ success: false, error: 'Oturum bulunamadı.' }, { status: 404 });
    }

    // Determine participant ID
    const participants = await db.query.sessionParticipants.findMany({
      where: eq(sessionParticipants.sessionId, sessionId),
      limit: 1,
    });
    let participantId = participants[0]?.id;
    if (!participantId) {
      const [newPart] = await db.insert(sessionParticipants).values({
        sessionId,
        displayName: 'Kasa Ödemesi',
        sessionToken: `cashier-mock-${Date.now()}`,
      }).returning();
      participantId = newPart.id;
    }

    const totalAmount = parseFloat(session.totalAmount || '0');
    const currentPaidAmount = parseFloat(session.paidAmount || '0');
    const remainingAmount = totalAmount - currentPaidAmount;
    
    let actualAmountToPay = amount;

    if (paymentType === 'full') {
      actualAmountToPay = remainingAmount > 0 ? remainingAmount : 0;
    }

    // Record the payment
    const [payment] = await db.insert(payments).values({
      sessionId,
      participantId,
      amount: actualAmountToPay.toFixed(2),
      method,
      status: 'completed',
    }).returning();

    // If itemized, update the orderItems
    if (paymentType === 'itemized' && items.length > 0) {
      for (const item of items) {
        if (item.paidQuantity > 0) {
          // We need raw sql or drizzle increment, but since we know the value from client (or we just increment it)
          // It's safer to increment it
          const orderItemRow = await db.query.orderItems.findFirst({ where: eq(orderItems.id, item.id) });
          if (orderItemRow) {
            await db.update(orderItems)
              .set({ paidQuantity: orderItemRow.paidQuantity + item.paidQuantity })
              .where(eq(orderItems.id, item.id));
          }
        }
      }
    }

    // Update session paidAmount
    const newPaidAmount = currentPaidAmount + actualAmountToPay;
    const isFullyPaid = newPaidAmount >= (totalAmount - 0.01);
    
    await db.update(tableSessions)
      .set({ 
        paidAmount: newPaidAmount.toFixed(2),
        status: isFullyPaid ? 'closed' : 'active',
        closedAt: isFullyPaid ? new Date() : null,
      })
      .where(eq(tableSessions.id, sessionId));

    // ── Full payment: close session, free the table ──────────────────────
    // Token stays the same — QR codes are permanent per table.
    // Next scan of the same QR will create a brand-new session automatically.
    if (isFullyPaid && session.tableId) {
      await db.update(tables)
        .set({ status: 'available' })
        .where(eq(tables.id, session.tableId));
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        payment,
        isFullyPaid,
        newPaidAmount,
      } 
    });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({ success: false, error: 'Ödeme işlemi başarısız' }, { status: 500 });
  }
}
