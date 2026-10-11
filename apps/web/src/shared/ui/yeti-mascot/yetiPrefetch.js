// Starts the GLB download alongside the lazily imported three.js chunk, so
// a first visit waits for the larger of the two rather than their sum. The
// asset cache (yetiAssets.js) takes the bytes and marks the model as parsed;
// later mounts reuse the parsed model and never fetch again.
const pending = new Map()
const parsed = new Set()

export function prefetchYetiModel(url) {
  if (parsed.has(url) || pending.has(url)) return
  const request = fetch(url, { credentials: "same-origin" }).then(
    (response) => {
      if (!response.ok)
        throw new Error(`Mascot model request failed (${response.status})`)
      return response.arrayBuffer()
    }
  )
  // A failure surfaces when the bytes are taken, not as an unhandled
  // rejection here.
  request.catch(() => {})
  pending.set(url, request)
}

// Hands over (and forgets) the prefetched bytes, fetching now if needed.
export function takeYetiModelBytes(url) {
  prefetchYetiModel(url)
  const request = pending.get(url)
  pending.delete(url)
  return request
}

export function markYetiModelParsed(url, value) {
  if (value) parsed.add(url)
  else parsed.delete(url)
}
