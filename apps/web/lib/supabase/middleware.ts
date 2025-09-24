import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

import { determineRedirectPath } from '@/lib/auth/redirect-utils';
import { devLogger } from '@/lib/utils/dev-logger';

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
  const isDevelopment = process.env.NODE_ENV === 'development';

  // 開発環境での認証スキップ設定（オプション）
  const skipAuthInDev = process.env.SKIP_AUTH_IN_DEV === 'true';

  if (!user && isProtectedPath) {
    // 開発環境で認証スキップが有効な場合は通す
    if (isDevelopment && skipAuthInDev) {
      devLogger.logDevInfo(
        '認証スキップが有効なため、未認証ユーザーの保護されたパスへのアクセスを許可',
        {
          path: request.nextUrl.pathname,
          skipAuthInDev,
        }
      );
      return supabaseResponse;
    }

    // 未認証で保護されたパスにアクセスした場合
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';

    // 元のURLを保持するためのクエリパラメータを追加
    const originalPath = determineRedirectPath(
      request.nextUrl.pathname + request.nextUrl.search
    );
    redirectUrl.searchParams.set('redirect_to', originalPath);

    devLogger.logDevInfo(
      '未認証ユーザーの保護されたパスへのアクセス、ログインページにリダイレクト',
      {
        originalPath,
        redirectTo: redirectUrl.toString(),
      }
    );

    return NextResponse.redirect(redirectUrl);
  }

  // セッションエラーがある場合の処理
  if (error && !isAuthPath) {
    // DevLoggerを使用してエラーログを制御
    devLogger.logMiddlewareError(error, {
      path: request.nextUrl.pathname,
      isProtectedPath,
      isAuthPath,
    });

    // 開発環境で認証スキップが有効な場合は通す
    if (isDevelopment && skipAuthInDev && isProtectedPath) {
      devLogger.logDevInfo(
        '認証スキップが有効なため、保護されたパスへのアクセスを許可',
        {
          path: request.nextUrl.pathname,
        }
      );
      return supabaseResponse;
    }

    // 認証が必要なパスでのみリダイレクト
    if (isProtectedPath) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/';

      // 開発環境では詳細なエラー情報を含める
      if (isDevelopment) {
        redirectUrl.searchParams.set('dev_info', 'auth_required');
        devLogger.logDevInfo(
          '認証が必要なパスへの未認証アクセス、リダイレクト実行',
          {
            originalPath: request.nextUrl.pathname,
            redirectTo: redirectUrl.toString(),
          }
        );
      } else {
        redirectUrl.searchParams.set('error', 'session_expired');
      }

      return NextResponse.redirect(redirectUrl);
    }
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
