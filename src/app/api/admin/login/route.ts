import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Kullanıcı adı ve şifre gereklidir.' }, { status: 400 });
    }

    // Gerçek bir sistemde bcrypt ile şifre kıyaslaması yapılmalıdır, demo için plaintext kıyaslaması yapıyoruz.
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.username, username), eq(users.passwordHash, password)))
      .limit(1);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Kullanıcı adı veya şifre hatalı.' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ success: false, error: 'Hesabınız askıya alınmış.' }, { status: 403 });
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      } 
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Kendi hesabınıza giriş yaparken bir hata oluştu.' }, { status: 500 });
  }
}
