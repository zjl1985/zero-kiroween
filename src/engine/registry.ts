/**
 * A content-agnostic registry of definitions keyed by string id. Registration
 * order is kept and is part of the contract: callers that iterate `all()`
 * (spawn tables, weapon steps, stat folds) rely on it for determinism.
 */
export interface Registry<T extends { readonly id: string }> {
  /** What this registry holds, used in error messages ("weapon", "enemy"). */
  readonly kind: string;
  /** Adds a definition; throws when the id is already taken. */
  register(def: T): T;
  /** The definition with this id; throws with a clear message when unknown. */
  get(id: string): T;
  /** The definition with this id, or undefined. */
  find(id: string): T | undefined;
  has(id: string): boolean;
  /** Every definition in registration order. */
  all(): readonly T[];
  /** Every id in registration order. */
  ids(): readonly string[];
}

export function createRegistry<T extends { readonly id: string }>(kind: string): Registry<T> {
  const byId = new Map<string, T>();
  const list: T[] = [];
  return {
    kind,
    register(def) {
      if (byId.has(def.id)) throw new Error(`Duplicate ${kind} id "${def.id}"`);
      byId.set(def.id, def);
      list.push(def);
      return def;
    },
    get(id) {
      const def = byId.get(id);
      if (!def)
        throw new Error(`Unknown ${kind} id "${id}" (registered: ${list.map((d) => d.id).join(", ") || "none"})`);
      return def;
    },
    find: (id) => byId.get(id),
    has: (id) => byId.has(id),
    all: () => list,
    ids: () => list.map((d) => d.id),
  };
}
