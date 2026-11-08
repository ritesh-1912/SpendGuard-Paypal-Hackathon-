export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvironmentOrThrow } = await import("@/lib/config/env");
    if (process.env.NODE_ENV !== "test" && process.env.NEXT_PHASE !== "phase-production-build") {
      validateEnvironmentOrThrow();
    }
  }
}
