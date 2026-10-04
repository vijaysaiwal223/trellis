/** Colleagues who can be put in charge of a subscription (fixtures until an SSO/directory feed exists). */
export const people = [
  { name: "Rohan Mehta", team: "Engineering" },
  { name: "Marcus Webb", team: "Engineering" },
  { name: "Jasmine Patel", team: "Finance" },
  { name: "Maya Rao", team: "Sales" },
  { name: "Priya Nair", team: "Sales" },
  { name: "Sofia Alvarez", team: "Marketing" },
] as const;

export const teamOf = (name: string) => people.find((person) => person.name === name)?.team;

/** The person using this Trellis session. Owns the decisions they record and receives the digest. */
export const SIGNED_IN_NAME = "Vijay Saiwal";

/** Generated avatar for a colleague (no real headshots exist for these fixtures). */
export const avatarUrl = (name: string) =>
  `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(name)}`;
