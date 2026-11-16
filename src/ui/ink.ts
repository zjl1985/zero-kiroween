/**
 * Ink Reveal: splits text into words (or characters for unspaced scripts such
 * as Chinese) so CSS can fill them in with ink one after another. Built with
 * text nodes only; the animation lives in styles.css and stops under
 * prefers-reduced-motion.
 */
export function inkReveal(el: HTMLElement, text: string): void {
  if (el.dataset.ink === text) return;
  el.dataset.ink = text;
  const parts = /\s/.test(text.trim()) ? text.split(/(\s+)/) : Array.from(text);
  let i = 0;
  el.replaceChildren(
    ...parts.map((part) => {
      if (/^\s+$/.test(part)) return document.createTextNode(part);
      const span = document.createElement("span");
      span.className = "ink-word";
      span.style.setProperty("--i", String(i++));
      span.textContent = part;
      return span;
    }),
  );
}
