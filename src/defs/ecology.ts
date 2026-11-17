/** Temporary paper treatments and safe, deterministic prop restoration. */
export const ECOLOGY = {
  /** Fresh ink soaks paper: no ignition or ongoing fuel consumption until it dries. */
  inkFlammability: 0,
  /** Extra clearance before solid paper unfolds or grows back around an actor. */
  actorClearance: 8,
  /** Retry occupied or burning regrowth sites without changing their drop history. */
  retrySeconds: 0.5,
} as const;
