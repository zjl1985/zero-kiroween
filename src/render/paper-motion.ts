/** Synchronous render-only preference scope. No clock, simulation state or DOM.
 * Cached painters must not read this flag: select stable parts and change their
 * live placement instead, so toggling the setting cannot poison a sprite cache.
 */
let reduced = false;

export function reducedPaperMotion(): boolean {
  return reduced;
}

/** Nested previews restore the caller's preference, including on painter errors. */
export function withPaperMotion<T>(value: boolean, paint: () => T): T {
  const previous = reduced;
  reduced = value;
  try {
    return paint();
  } finally {
    reduced = previous;
  }
}
