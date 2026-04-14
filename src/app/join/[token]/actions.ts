'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Server Action: Cookie'ye masa bilgilerini yazar ve /menu'ye yönlendirir.
 * Cookie set etmek sadece Server Functions veya Route Handlers'da mümkündür.
 */
export async function joinTableAction(cookieData: string) {
  const cookieStore = await cookies();
  
  cookieStore.set('smartpay_table', cookieData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 saat
  });

  redirect('/menu');
}
