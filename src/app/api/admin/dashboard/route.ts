import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, menuItems, tableSessions, tables } from '@/lib/db/schema';
import { gte, ne, sql, and } from 'drizzle-orm';

/**
 * GET /api/admin/dashboard
 * Restoran için 24 saatlik, 7 günlük ve 30 günlük gelir istatistiklerini döndürür.
 */
export async function GET() {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── Revenue aggregation helper (raw SQL sum on orders.total_amount) ──
    const revenueQuery = async (since: Date) => {
      const result = await db
        .select({
          totalRevenue: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`,
          totalOrders:  sql<number>`COUNT(${orders.id})`,
        })
        .from(orders)
        .where(
          and(
            ne(orders.status, 'cancelled'),
            gte(orders.createdAt, since)
          )
        );
      return {
        revenue: parseFloat(result[0].totalRevenue ?? '0'),
        count:   Number(result[0].totalOrders ?? 0),
      };
    };

    const [stats24h, stats7d, stats30d] = await Promise.all([
      revenueQuery(last24h),
      revenueQuery(last7d),
      revenueQuery(last30d),
    ]);

    // ── Active tables right now ──
    const activeSessions = await db
      .select({ id: tableSessions.id })
      .from(tableSessions)
      .where(sql`${tableSessions.status} = 'active'`);

    // ── Hourly revenue for today (24 bars for chart) ──
    const hourlyRows = await db
      .select({
        hour:    sql<number>`EXTRACT(HOUR FROM ${orders.createdAt} AT TIME ZONE 'Europe/Istanbul')`,
        revenue: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      })
      .from(orders)
      .where(
        and(
          ne(orders.status, 'cancelled'),
          gte(orders.createdAt, last24h)
        )
      )
      .groupBy(sql`EXTRACT(HOUR FROM ${orders.createdAt} AT TIME ZONE 'Europe/Istanbul')`);

    // Build a full 24-slot array — use Istanbul current hour
    const hourlyMap = new Map<number, number>();
    hourlyRows.forEach((r) => hourlyMap.set(Number(r.hour), parseFloat(r.revenue)));
    // Current hour in Istanbul (UTC+3)
    const currentHourIstanbul = (now.getUTCHours() + 3) % 24;
    const hourlyRevenue = Array.from({ length: 24 }, (_, i) => {
      const hour = (currentHourIstanbul - 23 + i + 24) % 24;
      return { hour, revenue: hourlyMap.get(hour) ?? 0 };
    });

    // ── Top selling items (last 30 days) ──
    const topItems = await db
      .select({
        name:        menuItems.name,
        totalSold:   sql<number>`SUM(${orderItems.quantity})`,
        totalRevenue: sql<string>`SUM(${orderItems.totalPrice})`,
      })
      .from(orderItems)
      .innerJoin(orders,     sql`${orderItems.orderId} = ${orders.id}`)
      .innerJoin(menuItems,  sql`${orderItems.menuItemId} = ${menuItems.id}`)
      .where(
        and(
          ne(orders.status, 'cancelled'),
          gte(orders.createdAt, last30d)
        )
      )
      .groupBy(menuItems.name)
      .orderBy(sql`SUM(${orderItems.quantity}) DESC`)
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        revenue: {
          last24h:  stats24h.revenue,
          last7d:   stats7d.revenue,
          last30d:  stats30d.revenue,
        },
        orders: {
          last24h:  stats24h.count,
          last7d:   stats7d.count,
          last30d:  stats30d.count,
        },
        activeTables: activeSessions.length,
        hourlyRevenue,
        topItems: topItems.map((i) => ({
          name:        i.name,
          totalSold:   Number(i.totalSold),
          totalRevenue: parseFloat(i.totalRevenue ?? '0'),
        })),
        fetchedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
