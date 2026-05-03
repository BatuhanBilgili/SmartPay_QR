import { NextResponse, NextRequest } from 'next/server';

/**
 * GET /api/session/clear
 * Route Handler that deletes stale session cookies and redirects to home.
 * Called when the menu page detects the cookie's sessionId is closed/cancelled.
 * Cookies can only be mutated inside Route Handlers or Server Actions.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const response = NextResponse.redirect(new URL('/', origin));
  
  // Delete stale cookies — the user must re-scan the QR
  response.cookies.delete('smartpay_table');
  response.cookies.delete('smartpay_participant');

  return response;
}
