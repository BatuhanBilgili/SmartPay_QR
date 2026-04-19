import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { menuItems, categories, restaurants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function getRestaurantId() {
  const allRest = await db.select({ id: restaurants.id }).from(restaurants).limit(1);
  return allRest[0]?.id;
}

export async function GET() {
  try {
    const rawCategories = await db.select().from(categories).orderBy(categories.sortOrder, categories.createdAt);
    const rawItems = await db.select().from(menuItems).orderBy(menuItems.sortOrder, menuItems.createdAt);

    return NextResponse.json({ 
      success: true, 
      data: {
        categories: rawCategories,
        items: rawItems,
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const restId = await getRestaurantId();
    if (!restId) throw new Error('Restoran bulunamadı.');

    const body = await request.json();
    const { action, name, price, imageUrl, categoryId, description } = body;

    // action: 'item' or 'category'
    if (action === 'category') {
      const [newCategory] = await db.insert(categories).values({
        restaurantId: restId,
        name,
        isActive: true,
      }).returning();
      return NextResponse.json({ success: true, category: newCategory });
    }

    if (action === 'item') {
      const [newItem] = await db.insert(menuItems).values({
        categoryId,
        name,
        price,
        imageUrl,
        description,
        isAvailable: true,
      }).returning();
      return NextResponse.json({ success: true, item: newItem });
    }

    return NextResponse.json({ success: false, error: 'Bilinmeyen işlem.' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { action, id, name, price, imageUrl, isAvailable, isActive } = body;

    if (!id) return NextResponse.json({ success: false, error: 'ID gerekli.' }, { status: 400 });

    if (action === 'category') {
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (isActive !== undefined) updates.isActive = isActive;
      
      const [updated] = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
      return NextResponse.json({ success: true, category: updated });
    }

    if (action === 'item') {
      const updates: any = { updatedAt: new Date() };
      if (name !== undefined) updates.name = name;
      if (price !== undefined) updates.price = price;
      if (imageUrl !== undefined) updates.imageUrl = imageUrl;
      if (isAvailable !== undefined) updates.isAvailable = isAvailable;

      const [updated] = await db.update(menuItems).set(updates).where(eq(menuItems.id, id)).returning();
      return NextResponse.json({ success: true, item: updated });
    }

    return NextResponse.json({ success: false, error: 'Bilinmeyen işlem.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
