import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.vitest.ts', 'src/test/**/*.test.ts'],
    reporters:
      process.env.GITHUB_ACTIONS === 'true'
        ? [
            'tree',
            [
              'github-actions',
              {
                jobSummary: {
                  enabled: true,
                },
              },
            ],
          ]
        : ['tree'],
    onConsoleLog() {
      return false;
    },
  },
});
