import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tableSessions, sessionParticipants, tables } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * POST /api/sessions
 * Yeni bir session oluşturur veya mevcut session'a katılır
 * 
 * Body:
 * - tableId: string (masa ID'si)
 * - displayName: string (kullanıcının görünen adı)
 * - avatarEmoji?: string (emoji avatar, varsayılan 👤)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tableId, displayName, avatarEmoji } = body;

    if (!tableId || !displayName) {
      return NextResponse.json(
        { success: false, error: 'tableId ve displayName zorunludur' },
        { status: 400 }
      );
    }

    // Masayı kontrol et
    const table = await db.query.tables.findFirst({
      where: eq(tables.id, tableId),
    });

    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Masa bulunamadı' },
        { status: 404 }
      );
    }

    // Aktif session var mı?
    let activeSession = await db.query.tableSessions.findFirst({
      where: and(
        eq(tableSessions.tableId, tableId),
        eq(tableSessions.status, 'active')
      ),
    });

    // Yoksa yeni session oluştur
    if (!activeSession) {
      const [newSession] = await db
        .insert(tableSessions)
        .values({
          tableId,
          token: nanoid(32),
          status: 'active',
          guestCount: 1,
        })
        .returning();

      activeSession = newSession;

      // Masayı "occupied" yap
      await db
        .update(tables)
        .set({ status: 'occupied' })
        .where(eq(tables.id, tableId));
    } else {
      // Mevcut session'ın guest count'unu artır
      await db
        .update(tableSessions)
        .set({
          guestCount: (activeSession.guestCount || 1) + 1,
        })
        .where(eq(tableSessions.id, activeSession.id));
    }

    // Katılımcı oluştur
    const participantToken = nanoid(64);
    const [participant] = await db
      .insert(sessionParticipants)
      .values({
        sessionId: activeSession.id,
        displayName: displayName.trim(),
        avatarEmoji: avatarEmoji || '👤',
        sessionToken: participantToken,
        isActive: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        session: activeSession,
        participant: {
          ...participant,
          sessionToken: participantToken,
        },
      },
    });
  } catch (error) {
    console.error('Session create error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sessions?sessionId=xxx
 * Session detaylarını döndürür (katılımcılar, siparişler, ödemeler)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId parametresi zorunludur' },
        { status: 400 }
      );
    }

    const session = await db.query.tableSessions.findFirst({
      where: eq(tableSessions.id, sessionId),
      with: {
        table: true,
        participants: {
          where: eq(sessionParticipants.isActive, true),
        },
        orders: {
          with: {
            items: {
              with: {
                menuItem: true,
                claims: {
                  with: {
                    participant: true,
                  },
                },
              },
            },
          },
        },
        payments: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Session fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
