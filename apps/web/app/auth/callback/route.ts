import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  buildAuthRedirectUrl,
  parseAuthState,
} from '@/lib/auth/redirect-utils';
import { createClient } from '@/lib/supabase/server';

// 動的レンダリングを強制
export const dynamic = 'force-dynamic';

// リクエストバリデーションスキーマ
const CallbackRequestSchema = z.object({
  code: z.string().optional(), // OAuth拒否時はcodeが無い場合がある
  state: z.string().optional(),
  error: z.string().optional(), // OAuth拒否時のエラーコード
  error_description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const traceId = crypto.randomUUID();

  try {
    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // バリデーション
    const validatedData = CallbackRequestSchema.parse({
      code: code || undefined,
      state: state || undefined,
      error: error || undefined,
      error_description: errorDescription || undefined,
    });

    // OAuth拒否・中断の処理
    if (validatedData.error) {
      console.warn('[AUTH_CALLBACK_OAUTH_ERROR]', {
        traceId,
        error: validatedData.error,
        description: validatedData.error_description,
      });

      const redirectUrl = new URL('/', request.nextUrl.origin);

      // エラーコードに応じた適切なエラーメッセージを設定
      if (validatedData.error === 'access_denied') {
        redirectUrl.searchParams.set('error', 'oauth_denied');
      } else if (validatedData.error === 'cancelled') {
        redirectUrl.searchParams.set('error', 'oauth_cancelled');
      } else {
        redirectUrl.searchParams.set('error', 'auth_failed');
      }

      return NextResponse.redirect(redirectUrl);
    }

    // 認証コードが無い場合
    if (!validatedData.code) {
      console.error('[AUTH_CALLBACK_NO_CODE]', { traceId });

      const redirectUrl = new URL('/', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', 'oauth_cancelled');
      return NextResponse.redirect(redirectUrl);
    }

    // state情報からリダイレクト先を取得
    let redirectTo = '/home';
    if (validatedData.state) {
      const parsedState = parseAuthState(validatedData.state);
      if (parsedState) {
        redirectTo = parsedState.redirectTo;
      } else {
        console.warn('[AUTH_CALLBACK_INVALID_STATE]', {
          traceId,
          state: validatedData.state,
        });
      }
    }

    // Supabaseクライアントを作成
    const supabase = createClient();

    // OAuth認証コードをセッションに交換
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(validatedData.code);

    if (exchangeError) {
      console.error('[AUTH_CALLBACK_ERROR]', {
        traceId,
        error: exchangeError.message,
      });

      // 認証エラーの場合はトップページにリダイレクト
      const redirectUrl = new URL('/', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', 'auth_failed');
      return NextResponse.redirect(redirectUrl);
    }

    if (!data.session) {
      console.error('[AUTH_CALLBACK_NO_SESSION]', { traceId });

      const redirectUrl = new URL('/', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', 'no_session');
      return NextResponse.redirect(redirectUrl);
    }

    console.log('[AUTH_CALLBACK_SUCCESS]', {
      traceId,
      userId: data.user?.id,
      email: data.user?.email,
      redirectTo,
    });

    // 認証成功後は元のURL（またはホーム）にリダイレクト
    const finalRedirectUrl = buildAuthRedirectUrl(
      request.nextUrl.origin,
      redirectTo
    );
    return NextResponse.redirect(finalRedirectUrl);
  } catch (error) {
    console.error('[AUTH_CALLBACK_VALIDATION_ERROR]', { traceId, error });

    if (error instanceof z.ZodError) {
      // バリデーションエラーの場合もトップページにリダイレクト
      const redirectUrl = new URL('/', request.nextUrl.origin);
      redirectUrl.searchParams.set('error', 'invalid_request');
      return NextResponse.redirect(redirectUrl);
    }

    // その他のエラーもトップページにリダイレクト
    const redirectUrl = new URL('/', request.nextUrl.origin);
    redirectUrl.searchParams.set('error', 'server_error');
    return NextResponse.redirect(redirectUrl);
  }
}
