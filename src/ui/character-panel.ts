import type { CatId } from "../cats/types.js";
import type { Locale, MessageKey } from "../content/keys.js";
import { t } from "../content/i18n.js";
import { CHARACTERS, character } from "../game/characters.js";
import { drawOfficialHead } from "../render/layout.js";
import { paintSkillIcon } from "../render/combat-fx.js";
export function characterValues(id: CatId): Record<string, string | number> {
  const d = character(id),
    z = CHARACTERS.zero,
    n = CHARACTERS.nicole;
  return {
    name: id === "zero" ? "Zero" : "Nicole",
    hp: d.maxHp,
    speed: d.speed,
    cooldown: d.cooldown,
    decoy: z.decoyLife,
    empower: z.empowerDuration,
    pierce: z.empoweredPierce,
    stars: n.orbitCount,
    field: n.fieldDuration,
    shield: n.shieldCharges,
    shieldTime: n.shieldDuration,
    slowPercent: Math.round((1 - n.slowMultiplier) * 100),
    threshold: n.rescueThreshold,
    rescue: n.rescueCharges,
    rescueTime: n.rescueDuration,
  };
}
export function characterCopy(
  locale: Locale,
  id: CatId,
  part:
    | "role"
    | "story"
    | "tactic"
    | "attack.name"
    | "attack.desc"
    | "active.short"
    | "active.name"
    | "active.desc"
    | "passive.name"
    | "passive.desc",
): string {
  return t(locale, `${id}.${part}` as MessageKey, characterValues(id));
}
export function paintPortrait(canvas: HTMLCanvasElement, id: CatId): void {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 64, 52);
  drawOfficialHead(
    ctx,
    {
      id,
      x: 32,
      y: 48,
      facing: 1,
      moving: false,
      dashing: false,
      hurt: false,
      time: 0,
    },
    { scale: 0.15 },
  );
}
export function paintCharacterPanel(locale: Locale, id: CatId): void {
  const set = (key: string, text: string) => {
    document.getElementById(key)!.textContent = text;
  };
  document.body.dataset.cat = id;
  set("cat-choice-label", t(locale, "selector.title"));
  set("selector-kicker", t(locale, "selector.kicker"));
  set("profile-skill-key",t(locale,"hud.space"));
  set("profile-name", id === "zero" ? "Zero" : "Nicole");
  set("profile-role", characterCopy(locale, id, "role"));
  set("profile-story", characterCopy(locale, id, "story"));
  set(
    "profile-hp",
    `${t(locale, "selector.hp")}  ${"♥".repeat(character(id).maxHp)}`,
  );
  set(
    "profile-speed",
    `${t(locale, "selector.speed")}  ${character(id).speed}`,
  );
  set("profile-tactic", characterCopy(locale, id, "tactic"));
  set("hero-name", id === "zero" ? "ZERO" : "NICOLE");
  set("hero-role", characterCopy(locale, id, "role"));
  set("hero-kicker", t(locale, "selector.preview"));
  for (const candidate of ["zero", "nicole"] as const) {
    const b = document.getElementById(`btn-cat-${candidate}`)!;
    b.setAttribute("aria-pressed", String(candidate === id));
    b.querySelector(".choice-name")!.textContent = t(
      locale,
      candidate === "zero" ? "cat.zero.choice" : "cat.nicole.choice",
    );
    b.querySelector(".choice-role")!.textContent = characterCopy(
      locale,
      candidate,
      "role",
    );
    paintPortrait(b.querySelector("canvas")!, candidate);
  }
  paintPortrait(
    document.getElementById("profile-portrait") as HTMLCanvasElement,
    id,
  );
  for (const kind of ["attack", "active", "passive"] as const) {
    set(`skill-${kind}-type`, t(locale, `selector.${kind}`));
    set(`skill-${kind}-name`, characterCopy(locale, id, `${kind}.name`));
    set(`skill-${kind}-desc`, characterCopy(locale, id, `${kind}.desc`));
    paintSkillIcon(
      document.getElementById(`icon-${kind}`) as HTMLCanvasElement,
      id,
      kind,
    );
  }
  set("btn-start", t(locale, "title.start", characterValues(id)));
}
