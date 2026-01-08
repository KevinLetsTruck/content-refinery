import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/**/*.test.ts"],
    exclude: ["node_modules", ".next", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        ".next/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/types/**",
        "src/app/**/*.tsx", // Exclude React components for now
        "src/components/**", // Exclude UI components for now
      ],
      thresholds: {
        // Current baseline - increase as coverage improves
        // Current: ~24% lines, ~47% branches, ~41% functions
        statements: 20,
        branches: 20,
        functions: 20,
        lines: 20,
      },
    },
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
