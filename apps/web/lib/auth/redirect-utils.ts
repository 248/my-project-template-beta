/**
 * 認証リダイレクト処理のユーティリティ関数
 */

/**
 * リダイレクト先URLを安全に検証する
 */
export function validateRedirectUrl(url: string, origin: string): boolean {
  try {
    const redirectUrl = new URL(url);
    const originUrl = new URL(origin);

    // 同一オリジンのみ許可
    return redirectUrl.origin === originUrl.origin;
  } catch {
    return false;
  }
}

/**
 * 認証後のリダイレクト先URLを生成する
 */
export function buildAuthRedirectUrl(
  origin: string,
  targetPath?: string | null
): string {
  if (targetPath && validateRedirectUrl(targetPath, origin)) {
    return targetPath;
  }

  // デフォルトはホームページ
  return `${origin}/home`;
}

/**
 * ログイン時のstate情報を生成する
 */
export function generateAuthState(redirectTo?: string): string {
  const state = {
    redirectTo: redirectTo || '/home',
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
  };

  return btoa(JSON.stringify(state));
}

/**
 * state情報をパースする
 */
export function parseAuthState(stateString: string): {
  redirectTo: string;
  timestamp: number;
  nonce: string;
} | null {
  try {
    const decoded = atob(stateString);
    const state = JSON.parse(decoded);

    // 5分以内のstateのみ有効
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    if (state.timestamp < fiveMinutesAgo) {
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

/**
 * エラーコードからユーザーフレンドリーなメッセージを生成する
 */
export function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth_failed':
      return '認証に失敗しました。もう一度お試しください。';
    case 'oauth_cancelled':
      return 'ログインがキャンセルされました。';
    case 'oauth_denied':
      return 'アクセスが拒否されました。権限を許可してください。';
    case 'no_session':
      return 'セッションの作成に失敗しました。';
    case 'session_expired':
      return 'セッションが期限切れです。再度ログインしてください。';
    case 'invalid_request':
      return '不正なリクエストです。';
    case 'server_error':
      return 'サーバーエラーが発生しました。しばらく時間をおいてお試しください。';
    case 'network_error':
      return 'ネットワークエラーが発生しました。接続を確認してください。';
    default:
      return '予期しないエラーが発生しました。';
  }
}

/**
 * 現在のURLから認証後のリダイレクト先を決定する
 */
export function determineRedirectPath(currentPath: string): string {
  // 認証関連のパスは除外
  if (currentPath.startsWith('/auth') || currentPath === '/') {
    return '/home';
  }

  return currentPath;
}
