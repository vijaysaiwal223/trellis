"use client";

import { addDays, type ISODate } from "../deadlines";
import { dayMonth } from "@/lib/dates";
import { Heading, Text } from "@medusajs/ui";

export type UpcomingRenewal = { vendor: string; decideByISO: ISODate; value: string; owner: string | null };

/** Edge case: nothing needs a decision right now. Says when the next one enters the queue. */
export function AllClear({ upcoming }: { upcoming: UpcomingRenewal[] }) {
  const next = upcoming[0];
  // A renewal enters the queue 30 days before its decide-by date.
  const enters = next ? addDays(next.decideByISO, -30) : undefined;

  return (
    <div className="flex w-full flex-col items-center gap-[10px] rounded-[10px] border border-solid border-[#e4e4e7] bg-white px-[24px] py-[40px] text-center">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1b5e3d" strokeWidth="1.6" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5l2.5 2.5 5.5-6" />
      </svg>
      <Heading level="h2" className="text-[18px] font-semibold text-[#18181b]">
        {enters ? `Nothing needs a decision until ${dayMonth(enters)}` : "Nothing needs a decision"}
      </Heading>
      {next ? (
        <Text className="max-w-[520px] text-[14px] text-[#52525b]">
          {`${next.vendor} is the next to enter the queue${next.owner ? `. ${next.owner} will be asked for a recommendation that day.` : ", and nobody owns it yet."}`}
        </Text>
      ) : (
        <Text className="max-w-[520px] text-[14px] text-[#52525b]">Every open renewal has been handled.</Text>
      )}
      {upcoming.length > 0 ? (
        <div className="mt-[8px] w-full overflow-x-auto rounded-[8px] border border-solid border-[#e4e4e7]">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#fafafa] text-[12px] text-[#52525b]">
              <tr>
                <th className="px-[12px] py-[8px] font-normal">Coming up</th>
                <th className="px-[12px] py-[8px] font-normal">Decide by</th>
                <th className="px-[12px] py-[8px] text-right font-normal">Annual value</th>
                <th className="px-[12px] py-[8px] font-normal">Owner</th>
                <th className="px-[12px] py-[8px] font-normal">Enters queue</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.slice(0, 3).map((item) => (
                <tr key={item.vendor} className="border-t border-solid border-[#e4e4e7]">
                  <td className="px-[12px] py-[10px] font-medium text-[#18181b]">{item.vendor}</td>
                  <td className="px-[12px] py-[10px]">{dayMonth(item.decideByISO)}</td>
                  <td className="px-[12px] py-[10px] text-right">{item.value}</td>
                  <td className="px-[12px] py-[10px]">{item.owner ?? <span className="text-[#9a3412]">Unassigned</span>}</td>
                  <td className="px-[12px] py-[10px]">{dayMonth(addDays(item.decideByISO, -30))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
