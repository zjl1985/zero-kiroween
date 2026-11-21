/** Developer-only CPU/animation-frame sampling. DOM-free; no GPU timing claims.
 * Recording allocates no arrays: one bounded ring owns every numeric column.
 * Sorting/JSON preparation happens only when snapshot() is explicitly requested.
 */
export const PROFILE_LABELS = ["dry", "crowded", "first-water", "steady-wash", "repaint"] as const;
export type ProfileLabel = (typeof PROFILE_LABELS)[number];
export const PROFILE_PHASES = ["gen", "mask", "composite", "total"] as const;
export type ProfilePhase = (typeof PROFILE_PHASES)[number];
export type FramePhases = Partial<Record<ProfilePhase, number>>;
export interface ProfileMetadata {
  readonly version: string;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly dpr: number;
  readonly reduced: boolean;
  readonly seed: number;
  readonly variant?: string;
  readonly context?: Readonly<Record<string, string | number>>;
}
export interface TimingStats {
  readonly samples: number;
  readonly p50Ms: number | null;
  readonly p95Ms: number | null;
  readonly p99Ms: number | null;
  readonly maxMs: number | null;
  readonly over33MsCount: number;
  /** Fraction of valid samples, 0..1; null when there are no samples. */
  readonly over33MsRate: number | null;
}
function summarize(column: Float64Array, count: number): TimingStats {
  const sorted: number[] = [];
  let over33MsCount = 0;
  for (let i = 0; i < count; i++) {
    const value = column[i];
    if (!Number.isFinite(value)) continue;
    sorted.push(value);
    if (value > 33) over33MsCount++;
  }
  sorted.sort((a, b) => a - b);
  const n = sorted.length;
  const percentile = (q: number) => n ? sorted[Math.max(0, Math.ceil(n * q) - 1)] : null;
  return {
    samples: n, p50Ms: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99),
    maxMs: n ? sorted[n - 1] : null, over33MsCount,
    over33MsRate: n ? over33MsCount / n : null,
  };
}
export class FrameProfile {
  readonly capacity: number;
  private readonly metadata: ProfileMetadata;
  private readonly timestamps: Float64Array;
  private readonly intervals: Float64Array;
  private readonly cpu: Record<ProfilePhase, Float64Array>;
  private cursor = 0;
  private retained = 0;
  private recorded = 0;
  private rejected = 0;
  private previous: number | undefined;
  private active = false;
  private label: ProfileLabel = "dry";

  constructor(metadata: ProfileMetadata, capacity = 1800) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100_000)
      throw new RangeError("Profile capacity must be an integer from 1 to 100000");
    this.capacity = capacity;
    // Capture metadata by value: later resize/settings changes require a fresh capture.
    this.metadata = { ...metadata, viewport: { ...metadata.viewport },
      ...(metadata.context ? { context: { ...metadata.context } } : {}) };
    this.timestamps = new Float64Array(capacity);
    this.intervals = new Float64Array(capacity);
    this.cpu = {
      gen: new Float64Array(capacity), mask: new Float64Array(capacity),
      composite: new Float64Array(capacity), total: new Float64Array(capacity),
    };
  }
  /** Begin/reset one labelled capture. Export the old snapshot before starting another. */
  start(label: ProfileLabel): void {
    if (!PROFILE_LABELS.includes(label)) throw new RangeError("Unknown profile label");
    this.label = label;
    this.cursor = this.retained = this.recorded = this.rejected = 0;
    this.previous = undefined;
    this.active = true;
    this.timestamps.fill(NaN);
    this.intervals.fill(NaN);
    for (const phase of PROFILE_PHASES) this.cpu[phase].fill(NaN);
  }
  stop(): void { this.active = false; }
  get running(): boolean { return this.active; }

  /** timestampMs is the rAF callback timestamp, not performance.now() after rendering.
   * First callback has CPU samples but no frame interval. Missing/invalid CPU phases
   * stay missing, never zero. Hidden-tab pauses must be stopped by the caller.
   */
  record(timestampMs: number, phases?: FramePhases): void {
    if (!this.active) return;
    if (!Number.isFinite(timestampMs) || timestampMs < 0 ||
        (this.previous !== undefined && timestampMs <= this.previous)) {
      this.rejected++;
      return;
    }
    const at = this.cursor;
    this.timestamps[at] = timestampMs;
    this.intervals[at] = this.previous === undefined ? NaN : timestampMs - this.previous;
    this.previous = timestampMs;
    for (const phase of PROFILE_PHASES) {
      const value = phases?.[phase];
      this.cpu[phase][at] = typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : NaN;
    }
    this.cursor = (at + 1) % this.capacity;
    this.retained = Math.min(this.capacity, this.retained + 1);
    this.recorded++;
  }

  /** JSON-safe nearest-rank percentiles, computed over the retained ring window only. */
  snapshot() {
    const first = this.retained ? (this.cursor - this.retained + this.capacity) % this.capacity : 0;
    const last = (this.cursor - 1 + this.capacity) % this.capacity;
    return {
      schemaVersion: 1,
      metadata: { ...this.metadata, viewport: { ...this.metadata.viewport },
        ...(this.metadata.context ? { context: { ...this.metadata.context } } : {}) },
      label: this.label,
      running: this.active,
      capacity: this.capacity,
      framesRecorded: this.recorded,
      framesRetained: this.retained,
      framesOverwritten: this.recorded - this.retained,
      rejectedTimestamps: this.rejected,
      retainedStartTimestampMs: this.retained ? this.timestamps[first] : null,
      retainedEndTimestampMs: this.retained ? this.timestamps[last] : null,
      percentileMethod: "nearest-rank",
      frameIntervals: summarize(this.intervals, this.retained),
      cpuMs: {
        gen: summarize(this.cpu.gen, this.retained),
        mask: summarize(this.cpu.mask, this.retained),
        composite: summarize(this.cpu.composite, this.retained),
        total: summarize(this.cpu.total, this.retained),
      },
      measurement: "rAF intervals and CPU submission time only; excludes complete GPU/raster/presentation timing",
    };
  }
}
