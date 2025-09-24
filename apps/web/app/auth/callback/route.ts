import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

// リクエストバリデーションスキーマ
const CallbackRequestSchema = z.object({
  code: z.string().min(1, 'OAuth認証コードが必要です'),
  state: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const traceId = crypto.randomUUID();

  try {
    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    // バリデーション
    const validatedData = CallbackRequestSchema.parse({
      code,
      state: state || undefined,
    });

    // Supabaseクライアントを作成
    const supabase = createClient();

    // OAuth認証コードをセッションに交換
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      validatedData.code
    );

    if (error) {
      console.error('[AUTH_CALLBACK_ERROR]', { traceId, error: error.message });

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
    });

    // 認証成功後はホームページにリダイレクト
    const redirectUrl = new URL('/home', request.nextUrl.origin);
    return NextResponse.redirect(redirectUrl);
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
