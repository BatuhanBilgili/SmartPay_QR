import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST /api/participant-cookie
 * Saves participant info to a cookie after joining a table session.
 * This is needed because cookies can only be set in Route Handlers or Server Actions.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { participantId, displayName, avatarEmoji } = body;

    if (!participantId || !displayName) {
      return NextResponse.json(
        { success: false, error: 'participantId ve displayName zorunludur' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    
    cookieStore.set('smartpay_participant', JSON.stringify({
      participantId,
      displayName,
      avatarEmoji: avatarEmoji || '👤',
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set participant cookie error:', error);
    return NextResponse.json(
      { success: false, error: 'Cookie ayarlanamadı' },
      { status: 500 }
    );
  }
}
