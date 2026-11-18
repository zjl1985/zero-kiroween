/** Zero's numbers: base kit, meow-bolt hand weapon, mirror-dash decoy and empowered fire. */
export const ZERO_STATS = {
  maxHp: 4,
  speed: 126,
  accent: "#e4b76c",
  attackInterval: 0.34,
  shotSpeed: 370,
  shotLife: 0.55,
  shotDamage: 1,
  dashSpeed: 370,
  dashTime: 0.2,
  cooldown: 3,
  invulnerability: 0.24,
  decoyLife: 1.2,
  decoyRange: 145,
  empowerDuration: 2,
  empoweredInterval: 0.17,
  empoweredPierce: 2,
  /** The mirror dash cuts a white hole through washed or painted paper (wash grid only). */
  dashCutRadius: 16,
  dashCutPower: 1,
} as const;
