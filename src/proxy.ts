import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const protectedPrefixes = ['/student', '/entity', '/admin'];
  const isProtected = protectedPrefixes.some(p => pathname.startsWith(p));
  const isAuthPage = pathname === '/login' || pathname === '/register';

  // 1. If no user, just protect dashboards
  if (!user) {
    if (isProtected) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return supabaseResponse;
  }

  // 2. We have a user, fetch their status
  const { data: profile } = await supabase
    .from('profiles')
    .select('account_status')
    .eq('id', user.id)
    .single();

  const status = profile?.account_status;

  // 3. Handle Banned/Pending users
  if (status === 'banned' || status === 'pending') {
    if (isProtected) {
      // If they try to go to a dashboard, force sign out and kick to login
      await supabase.auth.signOut();
      const response = NextResponse.redirect(new URL(`/login?error=Account is ${status}`, request.url));
      // Clear cookies on the response
      supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value));
      return response;
    }
    // If they are on /login or /register, LET THEM STAY so they see the error
    return supabaseResponse;
  }

  // 4. Handle Approved users
  if (status === 'approved') {
    
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};