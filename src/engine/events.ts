/**
 * A typed, synchronous event bus for a deterministic simulation. Handlers run
 * in registration order, inside `emit`, with no async work and no randomness
 * of their own; any randomness must come from the caller's context. Handler
 * lists live here (module scope of the owner), never in the serialisable
 * state, so snapshots stay plain data.
 */
export type EventHandler<S, P, C> = (state: S, payload: P, ctx: C) => void;

export interface EventBus<S, E extends object, C> {
  /** Subscribes a handler; returns a function that removes it again. */
  on<K extends keyof E>(name: K, handler: EventHandler<S, E[K], C>): () => void;
  /** Runs every handler for `name` in registration order. */
  emit<K extends keyof E>(name: K, state: S, payload: E[K], ctx: C): void;
  /** Number of handlers subscribed to `name`. */
  count(name: keyof E): number;
}

export function createEventBus<S, E extends object, C>(): EventBus<S, E, C> {
  const handlers = new Map<keyof E, EventHandler<S, unknown, C>[]>();
  return {
    on(name, handler) {
      const list = handlers.get(name) ?? [];
      list.push(handler as EventHandler<S, unknown, C>);
      handlers.set(name, list);
      return () => {
        const i = list.indexOf(handler as EventHandler<S, unknown, C>);
        if (i >= 0) list.splice(i, 1);
      };
    },
    emit(name, state, payload, ctx) {
      const list = handlers.get(name);
      if (!list) return;
      // Handlers added while emitting wait for the next emit.
      const n = list.length;
      for (let i = 0; i < n && i < list.length; i++) list[i]!(state, payload, ctx);
    },
    count: (name) => handlers.get(name)?.length ?? 0,
  };
}
