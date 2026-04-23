import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

/**
 * /table/[token] -> /join/[token] yönlendirmesi
 * Seed verisindeki ve bazı eski linklerdeki uyumluluk için.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  redirect(`/join/${token}`);
}
