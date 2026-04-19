import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, restaurants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Helper to get the first restaurant ID. 
 * Assumes a single-tenant environment for now.
 */
async function getRestaurantId() {
  const allRest = await db.select({ id: restaurants.id }).from(restaurants).limit(1);
  return allRest[0]?.id;
}

export async function GET() {
  try {
    const data = await db.select().from(users).orderBy(users.createdAt);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const restId = await getRestaurantId();
    if (!restId) throw new Error('Restoran bulunamadı.');

    const body = await request.json();
    const { username, password, role, name } = body;

    if (!username || !password || !role) {
      return NextResponse.json({ success: false, error: 'Eksik veri.' }, { status: 400 });
    }

    const [newUser] = await db
      .insert(users)
      .values({
        restaurantId: restId,
        username,
        passwordHash: password, // Storing raw for demo, hash in production
        role,
        name,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      return NextResponse.json({ success: false, error: 'Bu kullanıcı adı zaten alınmış.' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, role, password, name, isActive } = body;

    if (!id) return NextResponse.json({ success: false, error: 'ID gerekli.' }, { status: 400 });

    const updates: any = {};
    if (role !== undefined) updates.role = role;
    if (password !== undefined && password.trim() !== '') updates.passwordHash = password;
    if (name !== undefined) updates.name = name;
    if (isActive !== undefined) updates.isActive = isActive;
    updates.updatedAt = new Date();

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
