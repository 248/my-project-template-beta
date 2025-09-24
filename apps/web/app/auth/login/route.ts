import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  generateAuthState,
  validateRedirectUrl,
} from '@/lib/auth/redirect-utils';
import { createClient } from '@/lib/supabase/server';

// リクエストバリデーションスキーマ
const LoginRequestSchema = z.object({
  provider: z.enum(['google', 'github', 'discord']),
  redirectTo: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();

  try {
    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const redirectTo = searchParams.get('redirectTo');

    // バリデーション
    const validatedData = LoginRequestSchema.parse({
      provider,
      redirectTo: redirectTo || undefined,
    });

    // リダイレクト先URLの検証
    let safeRedirectTo = '/home';
    if (validatedData.redirectTo) {
      const fullRedirectUrl = validatedData.redirectTo.startsWith('/')
        ? `${request.nextUrl.origin}${validatedData.redirectTo}`
        : validatedData.redirectTo;

      if (validateRedirectUrl(fullRedirectUrl, request.nextUrl.origin)) {
        safeRedirectTo = validatedData.redirectTo;
      }
    }

    // Supabaseクライアントを作成
    const supabase = createClient();

    // state情報を生成（リダイレクト先を含む）
    const state = generateAuthState(safeRedirectTo);

    // OAuth認証URLを生成
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: validatedData.provider as 'google' | 'github' | 'discord',
      options: {
        redirectTo: `${request.nextUrl.origin}/auth/callback`,
        queryParams: {
          state,
        },
      },
    });

    if (error) {
      console.error('[AUTH_LOGIN_ERROR]', { traceId, error: error.message });
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_PROVIDER_ERROR',
            message: 'OAuth認証の開始に失敗しました',
            details: { provider: validatedData.provider },
          },
          traceId,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        url: data.url,
      },
      traceId,
    });
  } catch (error) {
    console.error('[AUTH_LOGIN_VALIDATION_ERROR]', { traceId, error });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'リクエストパラメータが不正です',
            details: error.errors,
          },
          traceId,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error occurred',
        },
        traceId,
      },
      { status: 500 }
    );
  }
}
