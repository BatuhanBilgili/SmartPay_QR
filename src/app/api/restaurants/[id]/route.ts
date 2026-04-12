import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { restaurants, categories, menuItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/restaurants/[id]
 * Restoran bilgilerini ve menüsünü (kategoriler + ürünler) döndürür
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const restaurant = await db.query.restaurants.findFirst({
      where: eq(restaurants.id, id),
      with: {
        categories: {
          where: eq(categories.isActive, true),
          orderBy: (categories, { asc }) => [asc(categories.sortOrder)],
          with: {
            menuItems: {
              where: eq(menuItems.isAvailable, true),
              orderBy: (menuItems, { asc }) => [asc(menuItems.sortOrder)],
            },
          },
        },
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restoran bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    console.error('Restaurant fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
