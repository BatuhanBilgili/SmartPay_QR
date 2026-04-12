import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories, menuItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/menu/[restaurantId]
 * Restoranın menüsünü kategoriler ve ürünlerle birlikte döndürür
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const { restaurantId } = await params;

    const menuCategories = await db.query.categories.findMany({
      where: eq(categories.restaurantId, restaurantId),
      orderBy: (categories, { asc }) => [asc(categories.sortOrder)],
      with: {
        menuItems: {
          where: eq(menuItems.isAvailable, true),
          orderBy: (menuItems, { asc }) => [asc(menuItems.sortOrder)],
        },
      },
    });

    if (!menuCategories.length) {
      return NextResponse.json(
        { success: false, error: 'Bu restoran için menü bulunamadı' },
        { status: 404 }
      );
    }

    // İstatistikler
    const totalItems = menuCategories.reduce(
      (sum, cat) => sum + cat.menuItems.length,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        categories: menuCategories,
        stats: {
          categoryCount: menuCategories.length,
          itemCount: totalItems,
        },
      },
    });
  } catch (error) {
    console.error('Menu fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
