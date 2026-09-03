import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Next 16 resolves vite to the rolldown build while vitest carries its own, so
 * the two Plugin types are structurally different even though the plugins
 * themselves run fine. The cast is confined to this one line.
 */
export default defineConfig({
  // biome-ignore lint/suspicious/noExplicitAny: vite/rolldown Plugin type mismatch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [tsconfigPaths(), react()] as any,
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
