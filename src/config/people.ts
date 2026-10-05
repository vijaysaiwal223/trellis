/** Colleagues who can be put in charge of a subscription (fixtures until an SSO/directory feed exists). */
export const people = [
  { name: "Jordan Wu", team: "IT Operations" },
  { name: "Nadia Brooks", team: "Workplace" },
  { name: "Priya Shah", team: "Sales Ops" },
] as const;

export const teamOf = (name: string) => people.find((person) => person.name === name)?.team;

/** The person using this Trellis session: the renewal lead. Owns the decisions they record and receives the digest. */
export const SIGNED_IN_NAME = "Anika Rao";

/**
 * A placeholder face from Lorem Faces (AI-generated, not real people). Only two of its
 * five faces are female (ids 1 and 5), so every person gets one of those; the same name
 * always gets the same face. Swap this for real photos when the team has them.
 */
const FEMALE_FACE_IDS = [1, 5];

export const personPhotoUrl = (name: string) => {
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `https://www.loremfaces.net/128/id/${FEMALE_FACE_IDS[hash % FEMALE_FACE_IDS.length]}.jpg`;
};
