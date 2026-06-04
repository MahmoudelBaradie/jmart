/**
 * Minimal Node.js `process` typing so EXPO_PUBLIC_* env vars are accessible
 * without pulling in the full @types/node (which would override
 * RN/Hermes-specific globals).
 *
 * Expo inlines EXPO_PUBLIC_* values at build time via babel-preset-expo,
 * so `process.env.EXPO_PUBLIC_API_URL` resolves to a string literal at
 * bundling time. We only need to satisfy the TypeScript checker.
 */
declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
    NODE_ENV?: 'development' | 'production' | 'test';
    [key: string]: string | undefined;
  };
};
