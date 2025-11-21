export type TranscriptSegment = {
  startMs: number
  endMs: number
  text: string
}

/**
 * Returns a new list of segments where simple sentence-level overlap
 * between adjacent segments is removed from the later segment's text.
 *
 * Example:
 *   A: "...This is the sentence."
 *   B: "This is the sentence. And then more..."
 * becomes:
 *   A: "...This is the sentence."
 *   B: "And then more..."
 */
export function dedupeAdjacentSegments<T extends TranscriptSegment>(
  segments: T[],
): T[] {
  const result: T[] = []

  for (let i = 0; i < segments.length; i++) {
    const current = segments[i]
    if (i === 0) {
      result.push(current)
      continue
    }

    const prev = result[result.length - 1]
    const trimmed = dedupeLeadingOverlap(prev.text, current.text)

    result.push({
      ...current,
      text: trimmed,
    })
  }

  return result
}

// If next starts with the last sentence of prev, strip that sentence.
function dedupeLeadingOverlap(prev: string, next: string): string {
  const lastSentence = getLastSentence(prev)
  if (!lastSentence) return next

  const trimmedNext = next.trimStart()
  if (trimmedNext.startsWith(lastSentence)) {
    return trimmedNext.slice(lastSentence.length).trimStart()
  }
  return next
}

function getLastSentence(text: string): string | null {
  // Split on common sentence terminators.
  const parts = text
    .split(/([\.!?])/)
    .reduce<string[]>((acc, part, idx, arr) => {
      if (idx % 2 === 0) {
        const sentence = part + (arr[idx + 1] ?? '')
        acc.push(sentence)
      }
      return acc
    }, [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  if (parts.length === 0) return null
  return parts[parts.length - 1]
}

