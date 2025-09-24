import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function POST(_request: NextRequest) {
  const traceId = crypto.randomUUID();

  try {
    // Supabaseクライアントを作成
    const supabase = createClient();

    // 現在のセッションを取得
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('[AUTH_LOGOUT_SESSION_ERROR]', {
        traceId,
        error: sessionError.message,
      });
      return NextResponse.json(
        {
          error: {
            code: 'SESSION_ERROR',
            message: 'セッション情報の取得に失敗しました',
          },
          traceId,
        },
        { status: 500 }
      );
    }

    if (!session) {
      // セッションが存在しない場合でも成功として扱う
      console.log('[AUTH_LOGOUT_NO_SESSION]', { traceId });
      return NextResponse.json({
        success: true,
        message: 'Already logged out',
        traceId,
      });
    }

    // ログアウト実行
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[AUTH_LOGOUT_ERROR]', { traceId, error: error.message });
      return NextResponse.json(
        {
          error: {
            code: 'LOGOUT_ERROR',
            message: 'ログアウト処理に失敗しました',
          },
          traceId,
        },
        { status: 500 }
      );
    }

    console.log('[AUTH_LOGOUT_SUCCESS]', {
      traceId,
      userId: session.user?.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully logged out',
      traceId,
    });
  } catch (error) {
    console.error('[AUTH_LOGOUT_UNEXPECTED_ERROR]', { traceId, error });

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
