/**
 * Domain Model: LicenseExpiry
 * Pure expiry facts for a FastFree node license — no locale, no UI.
 * Constructed from the raw `expires_at` payload returned by the backend.
 */
export class LicenseExpiry {
  /** Licenses valid past this year are treated as perpetual. */
  public static readonly PERPETUAL_YEAR_THRESHOLD = 2099;
  private static readonly MS_PER_DAY = 86_400_000;

  /** True when the license never expires (empty source or year >= threshold). */
  public readonly isPerpetual: boolean;
  /** Normalized ISO date (yyyy-MM-dd) for display, or raw fallback when unparseable. */
  public readonly isoDate: string | null;
  /** Whole days left, or null when not computable (perpetual/unparseable). */
  public readonly daysRemaining: number | null;

  constructor(rawExpiresAt: string | null | undefined, referenceTime: number = Date.now()) {
    const raw = typeof rawExpiresAt === 'string' ? rawExpiresAt.trim() : '';

    if (!raw) {
      this.isPerpetual = true;
      this.isoDate = null;
      this.daysRemaining = null;
      return;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      // Unparseable source: surface its date part verbatim (never invent facts).
      this.isPerpetual = false;
      this.isoDate = raw.split('T')[0] || null;
      this.daysRemaining = null;
      return;
    }

    if (parsed.getFullYear() >= LicenseExpiry.PERPETUAL_YEAR_THRESHOLD) {
      this.isPerpetual = true;
      this.isoDate = null;
      this.daysRemaining = null;
      return;
    }

    this.isPerpetual = false;
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    this.isoDate = `${parsed.getFullYear()}-${month}-${day}`;
    this.daysRemaining = Math.ceil((parsed.getTime() - referenceTime) / LicenseExpiry.MS_PER_DAY);
  }
}
