/**
 * Server-Driven UI (SDUI) shared contract — public entry
 * FastFree ERP · packages/fastfree_sdui
 *
 * Consumed by both sides of the platform:
 * - Client: `packages/fastfree_lowcode` re-exports these types from
 *   `src/runtime/sdui/types.ts` (compatibility shim, type-only).
 * - Server: the delivery server (SDUI-03) and the verifier (SDUI-02)
 *   validate & store screens through the Zod schemas here.
 */

export * from './types'
export * from './screen.schema'
