import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, menuItems, tableSessions } from '@/lib/db/schema';
import { gte, lt, ne, sql, and } from 'drizzle-orm';

/**
 * GET /api/admin/dashboard/z-report?date=YYYY-MM-DD
 * Belirtilen günün (varsayılan: bugün) Z raporunu döndürür.
 * Tüm saatler Türkiye saatiyle (Europe/Istanbul, UTC+3) hesaplanır.
 */
export async function GET(req: NextRequest) {
  try {
    // ─── Determine the target date (Istanbul local) ───
    const dateParam = req.nextUrl.searchParams.get('date'); // e.g. "2026-04-17"

    let targetDateStr: string;
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      targetDateStr = dateParam;
    } else {
      // Today in Istanbul (UTC+3)
      const nowInIstanbul = new Date(Date.now() + 3 * 60 * 60 * 1000);
      targetDateStr = nowInIstanbul.toISOString().slice(0, 10);
    }

    // Istanbul midnight = UTC midnight minus 3 hours
    const [y, m, d] = targetDateStr.split('-').map(Number);
    const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - 3 * 60 * 60 * 1000);
    const endOfDay   = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // ── Summary figures ──
    const summary = await db
      .select({
        totalRevenue:  sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`,
        totalOrders:   sql<number>`COUNT(${orders.id})`,
        pendingOrders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'pending' THEN 1 END)`,
        servedOrders:  sql<number>`COUNT(CASE WHEN ${orders.status} = 'served' THEN 1 END)`,
      })
      .from(orders)
      .where(
        and(
          ne(orders.status, 'cancelled'),
          gte(orders.createdAt, startOfDay),
          lt(orders.createdAt, endOfDay)
        )
      );

    // ── Per-item breakdown ──
    const itemBreakdown = await db
      .select({
        name:         menuItems.name,
        category:     sql<string>`''`, // category join skipped for simplicity
        totalSold:    sql<number>`SUM(${orderItems.quantity})`,
        unitPrice:    orderItems.unitPrice,
        totalRevenue: sql<string>`SUM(${orderItems.totalPrice})`,
      })
      .from(orderItems)
      .innerJoin(orders,    sql`${orderItems.orderId} = ${orders.id}`)
      .innerJoin(menuItems, sql`${orderItems.menuItemId} = ${menuItems.id}`)
      .where(
        and(
          ne(orders.status, 'cancelled'),
          gte(orders.createdAt, startOfDay),
          lt(orders.createdAt, endOfDay)
        )
      )
      .groupBy(menuItems.name, orderItems.unitPrice)
      .orderBy(sql`SUM(${orderItems.totalPrice}) DESC`);

    // ── Hourly breakdown for the day ──
    const hourly = await db
      .select({
        hour:    sql<number>`EXTRACT(HOUR FROM ${orders.createdAt} AT TIME ZONE 'Europe/Istanbul')`,
        revenue: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`,
        count:   sql<number>`COUNT(${orders.id})`,
      })
      .from(orders)
      .where(
        and(
          ne(orders.status, 'cancelled'),
          gte(orders.createdAt, startOfDay),
          lt(orders.createdAt, endOfDay)
        )
      )
      .groupBy(sql`EXTRACT(HOUR FROM ${orders.createdAt} AT TIME ZONE 'Europe/Istanbul')`)
      .orderBy(sql`EXTRACT(HOUR FROM ${orders.createdAt} AT TIME ZONE 'Europe/Istanbul')`);

    // ── Active sessions still open (not yet closed) ──
    const openSessions = await db
      .select({ id: tableSessions.id })
      .from(tableSessions)
      .where(sql`${tableSessions.status} = 'active'`);

    const now = new Date();
    return NextResponse.json({
      success: true,
      data: {
        reportDate:    targetDateStr, // YYYY-MM-DD used by UI for date picker
        generatedAt:   now.toISOString(),
        summary: {
          totalRevenue:  parseFloat(summary[0].totalRevenue ?? '0'),
          totalOrders:   Number(summary[0].totalOrders ?? 0),
          pendingOrders: Number(summary[0].pendingOrders ?? 0),
          servedOrders:  Number(summary[0].servedOrders ?? 0),
        },
        openSessions: openSessions.length,
        itemBreakdown: itemBreakdown.map((i) => ({
          name:         i.name,
          totalSold:    Number(i.totalSold),
          unitPrice:    parseFloat(i.unitPrice ?? '0'),
          totalRevenue: parseFloat(i.totalRevenue ?? '0'),
        })),
        hourly: hourly.map((h) => ({
          hour:    Number(h.hour),
          revenue: parseFloat(h.revenue ?? '0'),
          count:   Number(h.count),
        })),
      },
    });
  } catch (error) {
    console.error('Z-Report error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
