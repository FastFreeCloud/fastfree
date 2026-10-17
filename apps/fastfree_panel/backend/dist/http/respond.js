/**
 * Success envelope. Every 2xx JSON response uses this shape so the SPA has one
 * place to unwrap.
 */
export function ok(data) {
    return { data };
}
//# sourceMappingURL=respond.js.map