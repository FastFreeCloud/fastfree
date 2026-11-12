/**
 * FastFree Hindsight Memory Sanitizer.
 *
 * Enforces zero secret leakage into long-term vector/graph storage.
 * Detects and redacts WireGuard private keys, Android keystore passwords,
 * tokens, high-entropy secrets, and internal Hyper-V appliance addresses.
 */

export interface SanitizationResult {
  cleanText: string;
  redactedCount: number;
  breachDetected: boolean;
  redactedTypes: string[];
}

export class MemorySanitizer {
  private static readonly PATTERNS: Record<string, RegExp> = {
    WIREGUARD_KEY: /(?:private_key|privatekey|preshared_key|Interface[\s\S]*?PrivateKey\s*=\s*)([A-Za-z0-9+/]{43}=)/gi,
    KEYSTORE_PASS: /(?:storepass|keypass|keystore_password|KEYSTORE_PASSWORD)\s*[=:]\s*([^\s"';]+)/gi,
    BEARER_AUTH: /Bearer\s+([a-zA-Z0-9_\-\.]{16,})/gi,
    PASEO_TOKEN: /paseo_pk_[a-zA-Z0-9_]{20,}/gi,
    GITHUB_TOKEN: /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}/gi,
    PEM_PRIVATE_KEY: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gi,
    INTERNAL_IPV4: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g,
    HYPERV_FQDN: /\bclient(?:[2-9]|1[0-1])\.(?:internal|lan|local|mesh)\b/gi,
  };

  /**
   * Sanitizes input before ingesting into Hindsight retain()
   */
  public static sanitize(input: string): SanitizationResult {
    let text = input;
    let redactedCount = 0;
    const redactedTypes: string[] = [];

    // 1. Regex & Pattern Masking
    for (const [key, regex] of Object.entries(this.PATTERNS)) {
      text = text.replace(regex, () => {
        redactedCount++;
        if (!redactedTypes.includes(key)) {
          redactedTypes.push(key);
        }
        return `[REDACTED_${key}]`;
      });
    }

    // 2. High-Entropy Token Detection (Shannon Entropy > 4.5 for strings >= 24 chars)
    text = text.replace(/\b([A-Za-z0-9+/=_-]{24,})\b/g, (token) => {
      if (this.calculateEntropy(token) > 4.5) {
        redactedCount++;
        if (!redactedTypes.includes('HIGH_ENTROPY_TOKEN')) {
          redactedTypes.push('HIGH_ENTROPY_TOKEN');
        }
        return '[REDACTED_ENTROPY_TOKEN]';
      }
      return token;
    });

    return {
      cleanText: text,
      redactedCount,
      breachDetected: redactedCount > 0,
      redactedTypes,
    };
  }

  private static calculateEntropy(str: string): number {
    const len = str.length;
    if (len === 0) return 0;
    const freqs: Record<string, number> = {};
    for (const char of str) {
      freqs[char] = (freqs[char] || 0) + 1;
    }
    let entropy = 0;
    for (const char in freqs) {
      const count = freqs[char] ?? 0;
      if (count > 0) {
        const p = count / len;
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }
}
