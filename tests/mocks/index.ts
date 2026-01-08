/**
 * Central mock exports for tests
 */

// Re-export all mocks
export * from "./prisma";
export * from "./anthropic";
export * from "./fetch";

// Type helpers for tests
export type MockFn<T extends (...args: any) => any> = ReturnType<typeof import("vitest").vi.fn<T>>;
