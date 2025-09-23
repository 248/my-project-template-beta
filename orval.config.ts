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
      clean: true,
      prettier: true,

    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
});