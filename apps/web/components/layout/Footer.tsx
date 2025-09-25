export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-0">
      <div className="container-wide">
        <div className="py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-4">
                Template Beta
              </h3>
              <p className="text-sm text-neutral-600">
                Next.js template with Cloudflare Workers and Supabase
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-4">
                リンク
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/health"
                    className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                  >
                    ヘルスチェック
                  </a>
                </li>
                <li>
                  <a
                    href="/api/health"
                    className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                  >
                    API ヘルスチェック
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-4">
                技術スタック
              </h3>
              <ul className="space-y-2">
                <li className="text-sm text-neutral-600">Next.js App Router</li>
                <li className="text-sm text-neutral-600">Cloudflare Workers</li>
                <li className="text-sm text-neutral-600">Supabase</li>
                <li className="text-sm text-neutral-600">Tailwind CSS</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-neutral-200">
            <p className="text-center text-sm text-neutral-500">
              © 2024 Template Beta. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
