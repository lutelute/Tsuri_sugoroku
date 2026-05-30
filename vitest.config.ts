import { defineConfig } from 'vitest/config';

// 純粋なゲームロジック（src/game, src/utils）のユニットテスト設定。
// React は不要なので environment は node。テストは src 内の *.test.ts に配置する。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
