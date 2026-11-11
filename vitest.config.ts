import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// `vite-tsconfig-paths` est ce qui fait résoudre l'alias `@/` sous Vitest
// (cf. .claude/rules/imports.md : l'alias tient à 4 endroits, celui-ci en fait partie).
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
