let fallbackSequence = 0

/** Produces collision-resistant identifiers for the in-memory repository. */
export const createId = (prefix: string) => {
  const randomId = globalThis.crypto?.randomUUID?.()
  if (randomId) return `${prefix}-${randomId}`
  fallbackSequence += 1
  return `${prefix}-${Date.now().toString(36)}-${fallbackSequence.toString(36)}`
}
