/**
 * Secret masking for text that came out of `clan vars list`.
 *
 * clan already replaces most values with `********`, but a real run shows
 * `emergency-access/password-hash` in the clear: it is a bcrypt string, which
 * clan treats as a non-secret value because it is not the password itself. A
 * bcrypt hash is still a credential — it is what an offline attacker cracks
 * against — and it belongs to an initrd rescue account.
 *
 * So the masking below is deliberately stricter than clan's: anything whose
 * key looks like a secret gets masked regardless of what clan decided.
 */

/** Keys that must never reach the browser in any form. Matched case
 * insensitively against the `group/name` path, on the full segment or as a
 * suffix, so `user-password-root/user-password-hash` matches `-hash`. */
const SECRET_KEY_PATTERNS: readonly RegExp[] = [
  /pass(word|wd)?(-hash)?$/i,
  /secret/i,
  /token$/i,
  /privatekey$/i,
  /repokey$/i,
  /identity-secret$/i,
  /^key$/i,
  /(^|[-_/])key$/i,
  /credential/i,
];

/** Values that look like material rather than a display string. Defence in
 * depth: even if a future clan release prints a secret under a key we did not
 * anticipate, the shape of the value gives it away. */
const SECRET_VALUE_PATTERNS: readonly RegExp[] = [
  /^\$6\$[./$A-Za-z0-9]{50,}$/, // bcrypt
  /^AGE-SECRET-KEY-1[0-9A-Z]{58}$/, // age private key
  /^ssh-ed2551[56] [A-Za-z0-9+/]{60,} /, // private key with comment
  /^-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /^[0-9a-f]{40,}$/, // long hex, e.g. a repo token
];

const MASK = '••••••••';

function keyLooksSecret(key: string): boolean {
  return SECRET_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function valueLooksSecret(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  return SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Mask one `key: value` line from `clan vars list`.
 *
 * The line format is `<group>/<name>: <value>` (verified in
 * docs/verified-outputs/vars-list.txt). Values are preserved as-is when they
 * are safe, so public vars such as `grafana-admin/username: admin` stay
 * readable and useful.
 */
export function maskVarsLine(line: string): string {
  const separator = line.indexOf(": ");
  if (separator === -1) return line;

  const key = line.slice(0, separator);
  const value = line.slice(separator + 2);

  if (keyLooksSecret(key) || valueLooksSecret(value)) {
    return `${key}: ${MASK}`;
  }
  return line;
}

/** Apply `maskVarsLine` to a whole `clan vars list` output. */
export function maskVarsOutput(stdout: string): string {
  return stdout.split("\n").map(maskVarsLine).join("\n");
}

/**
 * `clan state list` prints folder paths and hook names only, but run the same
 * pass anyway: it costs nothing and keeps a single rule for every text output
 * the panel forwards.
 */
export function maskTextOutput(stdout: string): string {
  return stdout
    .split("\n")
    .map((line) => {
      if (!line.includes(": ")) return line;
      if (valueLooksSecret(line.slice(line.indexOf(": ") + 2))) {
        return `${line.slice(0, line.indexOf(": ") + 2)}${MASK}`;
      }
      return line;
    })
    .join("\n");
}

/** Keys that `clan vars list` prints but this panel must never surface. */
export function isForbiddenVarKey(key: string): boolean {
  return keyLooksSecret(key);
}