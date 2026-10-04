/** Colleagues who can be put in charge of a subscription (fixtures until an SSO/directory feed exists). */
export const people = [
  { name: "Jordan Wu", team: "IT Operations" },
  { name: "Nadia Brooks", team: "Workplace" },
] as const;

export const teamOf = (name: string) => people.find((person) => person.name === name)?.team;

/** The person using this Trellis session: the renewal lead. Owns the decisions they record and receives the digest. */
export const SIGNED_IN_NAME = "Anika Rao";

/** Generated avatar for a colleague (no real headshots exist for these fixtures). */
export const avatarUrl = (name: string) =>
  `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(name)}`;
