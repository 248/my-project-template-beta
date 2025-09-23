import Link from 'next/link';

interface HeaderProps {
  showAuthButton?: boolean;
  isAuthenticated?: boolean;
}

export function Header({
  showAuthButton = false,
  isAuthenticated = false,
}: HeaderProps) {
  return (
    <header className="border-b border-neutral-200 bg-neutral-0 shadow-sm">
      <div className="container-wide">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-md bg-primary-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">TB</span>
              </div>
              <h1 className="text-xl font-semibold text-neutral-1000">
                Template Beta
              </h1>
            </Link>
          </div>

          <nav className="flex items-center space-x-4">
            <Link
              href="/health"
              className="text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              ヘルスチェック
            </Link>

            {showAuthButton && (
              <div className="flex items-center space-x-2">
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/home"
                      className="text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
                    >
                      ホーム
                    </Link>
                    <button type="button" className="btn-secondary text-sm">
                      ログアウト
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn-primary text-sm"
                    data-testid="login-button"
                  >
                    ログイン
                  </button>
                )}
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
