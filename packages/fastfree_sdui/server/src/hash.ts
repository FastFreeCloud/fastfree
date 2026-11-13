import crypto from 'node:crypto'

export function computeVersionHash(screen: unknown): string {
  const json = JSON.stringify(screen)
  return crypto.createHash('sha256').update(json).digest('hex')
}