import { FrameProfile } from "./frame-profile.js";

/** Developer-only capture controls; never mounted without ?profile=1. */
export function createFrameReview(metadata: () => ConstructorParameters<typeof FrameProfile>[0]) {
  if (new URLSearchParams(location.search).get("profile") !== "1") return null;
  const panel = document.createElement("details"), summary = document.createElement("summary"),
    label = document.createElement("select"), start = document.createElement("button"),
    stop = document.createElement("button"), download = document.createElement("button"),
    status = document.createElement("output");
  const labels = ["dry", "crowded", "first-water", "steady-wash", "repaint"] as const;
  let capture: FrameProfile | null = null, running = false;
  summary.textContent = "Frame capture";
  label.setAttribute("aria-label", "Capture scenario");
  for (const value of labels) {
    const option = document.createElement("option");
    option.value = option.textContent = value;
    label.append(option);
  }
  start.textContent = "Start new";
  stop.textContent = "Stop";
  download.textContent = "Export JSON";
  status.textContent = "Ready — select scenario";
  panel.style.cssText = "position:fixed;z-index:10000;top:env(safe-area-inset-top,0px);left:4px;max-width:calc(100vw - 8px);padding:6px;background:#eee3c9;color:#211c26;font:12px monospace;border:1px solid #665b50";
  for (const control of [label, start, stop, download]) control.style.cssText = "font:12px monospace;min-height:32px;margin:2px;color:#211c26;background:#fff6df";
  status.style.display = "block";
  panel.append(summary, label, start, stop, download, status);
  // Changing developer controls must not become movement/upgrade input.
  for (const event of ["keydown", "keyup", "pointerdown", "pointerup"])
    panel.addEventListener(event, (e) => e.stopPropagation());
  document.body.append(panel);
  const halt = (reason = "Stopped — export before starting a new capture") => {
    capture?.stop();
    running = false;
    status.textContent = reason;
  };
  start.addEventListener("click", () => {
    capture = new FrameProfile(metadata(), 3600);
    capture.start(labels[label.selectedIndex] ?? "dry");
    running = true;
    status.textContent = "Recording (latest 3600 frames)";
    panel.open = false;
  });
  stop.addEventListener("click", () => halt());
  download.addEventListener("click", () => {
    if (!capture) return;
    halt();
    const url = URL.createObjectURL(new Blob([JSON.stringify(capture.snapshot(), null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `paper-frames-${label.value}-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  return {
    get active() { return running; },
    stop: halt,
    record(now: number, phases: { gen: number; mask: number; composite: number; total: number }) {
      if (running) capture?.record(now, phases);
    },
  };
}
