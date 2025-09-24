import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

import { determineRedirectPath } from '@/lib/auth/redirect-utils';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // 認証が必要なパスかチェック
  const isProtectedPath = request.nextUrl.pathname.startsWith('/home');
  const isAuthPath = request.nextUrl.pathname.startsWith('/auth');

  if (!user && isProtectedPath) {
    // 未認証で保護されたパスにアクセスした場合
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';

    // 元のURLを保持するためのクエリパラメータを追加
    const originalPath = determineRedirectPath(
      request.nextUrl.pathname + request.nextUrl.search
    );
    redirectUrl.searchParams.set('redirect_to', originalPath);

    return NextResponse.redirect(redirectUrl);
  }

  // セッションエラーがある場合の処理
  if (error && !isAuthPath) {
    console.error('[MIDDLEWARE_SESSION_ERROR]', { error: error.message });

    // セッションエラーの場合はトップページにリダイレクト
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    redirectUrl.searchParams.set('error', 'session_expired');

    return NextResponse.redirect(redirectUrl);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() you must:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object here instead of the supabaseResponse object

  return supabaseResponse;
}
