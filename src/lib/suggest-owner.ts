import type { Renewal } from "@/features/renewal-risk/types";
import { people } from "@/config/people";

/**
 * A suggested owner for a renewal. An admin's default for the category wins while that
 * person is still in the directory; otherwise the person who already owns the most tools
 * in the same category, ties going to whoever owns the fewest overall.
 */
export function suggestOwner(
  subtitle: string,
  owned: Renewal[],
  departed: string[],
  preferred?: string,
): string | undefined {
  if (preferred && !departed.includes(preferred)) return preferred;
  const candidates = people.filter((person) => !departed.includes(person.name));
  const score = (name: string) => {
    const mine = owned.filter((row) => row.owner === name);
    return { same: mine.filter((row) => row.subtitle === subtitle).length, total: mine.length };
  };
  return [...candidates]
    .sort((a, b) => {
      const sa = score(a.name);
      const sb = score(b.name);
      return sb.same - sa.same || sa.total - sb.total;
    })[0]?.name;
}
