import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: './openapi/openapi.yaml',
    output: {
      mode: 'split',
      target: './packages/generated/src/client.ts',
      schemas: './packages/generated/src/models',
      client: 'fetch',
      mock: false,
      // Clean all generated files except our custom mutator
      clean: ['!orval-fetcher.ts'],
      prettier: true,
      override: {
        mutator: {
          path: './packages/generated/src/orval-fetcher.ts',
          name: 'orvalFetch',
        },
      },
    },
    hooks: {
      afterAllFilesWrite: [
        // Format generated files with Prettier
        'pnpm exec prettier --ignore-path scripts/.prettierignore.generated --write packages/generated/src/**/*.ts',
        // Lint and fix generated files with ESLint
        'pnpm exec eslint --no-ignore --config packages/generated/.eslintrc.js --ext .ts --fix packages/generated/src',
      ],
    },
  },
});
