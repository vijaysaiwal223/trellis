# Core Flow — "No renewal fires by surprise"

**Design principle:** a renewal is never *shown*; it's *routed* to a named person, at a fixed point before cancel-by, and it keeps escalating until someone records a decision.

**Assumptions (flag if wrong):** finance/procurement is accountable and works in Trellis. The tool owner is consulted and rarely logs in, so we reach them where they already are (email/Slack) with a no-login decision link. Uses only data-model fields: contract value, renewal date + type, notice period, seats purchased vs active, owner, payment history/YoY.

**Derived date:** `cancel-by = renewal date − notice period`. Everything below keys off it, never the renewal date.

---

## Actors
| Actor | Role in the flow | Channel |
|---|---|---|
| **Tool owner** | Answers *"do we still need this, and how many seats?"* | Email/Slack card → no-login decision page |
| **Finance / procurement** | Accountable for the outcome; executes cancel/renegotiate | Trellis (queue, detail) |
| **Backstop** (finance admins) | Takes over when the owner is silent, missing or departed | Trellis + Slack |

## Cadence (keyed to cancel-by)
| When | Who is pinged | Ask |
|---|---|---|
| **T-30** | Owner | Decide: Renew / Right-size / Cancel |
| **T-14** | Owner + finance (visible) | Reminder; queue rank rises |
| **T-7** | Finance admins | Auto-escalate; owner still may answer |
| **T-2** | Finance admins, urgent | "Decide today or it renews" |
| **Missed** | Finance admins | Recovery path (Frame 8b) |
| **No owner** (any time ≤ T-30) | Finance admins immediately | Assign owner first |

Quarter clustering: when 5+ renewals share a cancel-by week, the queue groups them and finance gets one digest instead of five pings.

---

## The 8 frames

**1. Owner nudge (T-30) — Slack/email card**
> *Salesforce renews Oct 20 for **$180,000**. You must cancel by **Sep 20**. 269 of 420 seats active (64%), price +22% YoY.*
> **[Renew] [Right-size] [Cancel] [Not mine]**

The whole decision fits in the message. It leads with the cancel-by date, the dollars and the usage.

**2. Owner decision page (no login)**
Opens from the card. It shows a one-line summary and the chosen action, plus an optional note. "Right-size" asks for a seat count. "Not mine" asks who is. Submitting records the decision and notifies finance.

**3. Silence path (T-14 → T-7)**
No response means the item climbs the queue, finance is cc'd, and at T-7 it auto-escalates. Nothing waits on the owner forever.

**4. Finance queue — ranked, with the reason**
*Exists in prototype.* Ranked by urgency (cancel-by proximity × auto-renew × value × owner gap). The banner names the top item and why. Auto-escalated rows are flagged.

**5. Renewal detail — one decision surface**
*Exists.* Timeline (cancel-by highlighted), plan/seat usage, decision-readiness checklist (owner → usage → decision), and a recommendation card.

**6. No owner or departed owner → reassign**
*Partly exists (assign owner).* The picker suggests candidates from the seat-holders with the most recent activity. After assignment the owner gets Frame 1 immediately with a shortened clock.

**7. Decide and execute**
*Exists (Renew / Cancel / Escalate).* Extend by outcome: **Cancel** turns into a cancellation-notice checklist with the deadline; **Right-size** carries the target seat count into negotiation; **Renew** logs the payment/price change for next year's comparison.

**8. Handled**
*Exists (decision recorded, row leaves queue).* The owner gets confirmation and an audit line is recorded (who, what, when). The badge count drops.
**8b. Missed-window recovery:** if cancel-by has passed, don't show a dead end. Offer *negotiate downsize at renewal*, *request goodwill cancellation*, or *accept and set a T-90 alert for next cycle*.

---

## Edge cases
- **Owner departs mid-cycle:** status flips to vacant, the item jumps to the backstop, and the reassign flow starts (Frame 6).
- **Owner says "Not mine":** captured as a reassign request; finance is pinged.
- **Month-to-month / manual:** lower weight, since silence isn't costly, but they still appear once inside the horizon.
- **Decision recorded, then facts change (price hike, seat drop):** the item re-opens.

## How we'll know it works
- Renewals with a recorded decision **≥ 7 days before cancel-by** (target: ~100%).
- **Surprise renewals** (fired with no decision): target zero.
- Median time from T-30 nudge to decision.
- Share of items that needed backstop escalation (should trend down as owners respond).

## Deliberately cut
Renewals calendar (still passive), redesigning notification settings, negotiation tooling beyond talking points, and AI as load-bearing; it stays a stretch layer on Frame 5's recommendation.

## Prototype coverage
Built: **1, 2, 4, 5, 6, 7, 8, 8b**, plus a Settings page (who's in charge, departure handoff rule, reminder schedule, cheap-tool policy).
- **Frame 1** (owner nudge card) is simulated via "Preview owner nudge" on the detail page — the exact Slack/email copy, with working [Renew] [Right-size] [Cancel] [Not mine] buttons.
- **Frame 2** (no-login decision page) is real: `/decide/[vendor]` renders outside Trellis's own chrome (no sidebar, no header — a separate route group), takes the seat count for Right-size or the actual owner for Not mine, and writes straight into the same shared state the finance queue reads.
- **Frame 8b** (missed-window recovery) now swaps in when cancel-by has passed: Negotiate downsize / Request goodwill cancellation / Accept & alert next cycle, instead of the generic Renew/Cancel/Escalate.
- Not built: **3** (the actual silence-climbs-the-queue timer). There's no clock in a prototype to simulate T-14→T-7 elapsing; `escalated` is derived instead from missed-window-or-unowned-and-imminent, and is now flagged directly on the queue row, not just in the notification feed.
