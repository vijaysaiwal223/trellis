# Prototype memo: preventing surprise renewals

**Snapshot:** Monday 5 October 2026 (the prototype's fixed "today")
**Scope:** the renewal decision flow, from queue to notice to confirmed outcome

## 1. Problem

Trellis has contract facts, but a renewal can still go through with no decision. Three things combine:

- The last day to cancel (cancel-by) comes before the renewal date, so the real deadline is earlier than most people expect.
- Auto-renewal makes silence costly: no answer means the contract renews on its existing terms.
- About 15% of subscriptions have no active owner, so nobody is watching them.

A dashboard that shows the risk doesn't make anyone act. The prototype is built so that a named person makes a decision before cancel-by.

## 2. Users and accountability

- **Finance or procurement (the lead, Anika Rao) owns the outcome.** She assigns an owner, reviews the recommendation, decides, and sends written notice.
- **The tool owner (Priya Shah) supplies the usage view.** They say whether the team still needs the tool and how many seats it needs.

This split is an assumption to test with customers. The prototype states it openly.

## 3. Chosen approach

A single queue, sorted by **decide-by**, which equals cancel-by (renewal date minus notice period). Each row has one next action, and the status tabs match the stages of the flow.

The decision path is:

1. **Assign an owner.** The picker suggests people who already own similar tools and shows the evidence. The lead can also decide herself.
2. **The owner recommends.** The owner sees the facts (value, seats, price change, notice deadline) and picks renew, reduce seats, renegotiate or cancel. The recommendation is advice only.
3. **The lead decides.** The decision can differ from the advice. For reduce or cancel, it moves to notice.
4. **Written notice goes out.** The app drafts the notice text, the lead sends it by the chosen method and marks it sent.
5. **The outcome is confirmed.** The renewal stays open until someone confirms the vendor's reply. Only then is it handled.

A lead who is also the owner of a tool records the decision directly, in one step.

If the cancel-by date has already passed, the locked-in view offers recovery paths instead of a normal cancellation: ask for a concession, plan the next cycle, or accept the renewal as is.

A progress indicator shows the journey (assign, recommend, decide, notice, outcome) on every drawer.

## 4. What the prototype is not

- **No backend, login or sharing.** State is saved in the browser on one device.
- **No delivery.** Nothing is sent to owners or vendors. The notice is text the lead copies.
- **No vendor integration.** The app doesn't read invoices, orders or seat counts from vendors.
- **Assumed contract terms.** The data has no contract start date, so the timeline assumes a 12-month term ending at the renewal date.
- **Placeholder people.** Names and avatars are fixtures. The avatars are AI-generated faces from Lorem Faces, not photos of real people.
- **An AI assistant (Bruno).** It answers questions about the portfolio from the facts on screen. It can't record decisions or contact anyone.

## 5. Gaps against the brief

These are known differences between the brief and the build. They're listed so they can be decided, not hidden.

| Brief | Build | Decision needed |
| --- | --- | --- |
| Reminders at T-14, finance takeover at T-7 | Overdue flag on the owner's list only. No reminder, no takeover. | Restore the takeover, or accept that the lead watches the queue. |
| "Handled" means the outcome is confirmed | Same, but the design shows "Handled" as soon as notice is sent | Keep the stricter rule (current) or follow the design. |
| Missed-deadline recovery | Locked-in view with recovery options | Confirm the options are the right ones. |
| Microsoft 365 as the demo case | The design's screens use Salesforce, Gong and Miro instead | Pick one demo case for the walkthrough. |

## 6. Success measure

From the framing memo, the goal is zero surprise renewals, not more dashboard views. Track:

- The share of renewals with a confirmed outcome before cancel-by.
- Surprise renewals with no recorded decision.
- Time from first request to decision.
- The share of renewals that need finance to take over.

## 7. Tradeoffs

- **A decision and escalation path over a calendar or more alerts.** Alerts show the risk; they don't create a decision.
- **Advice separate from decision.** The owner's recommendation doesn't close anything, so the lead keeps accountability.
- **A strict "handled" rule.** Recording a decision isn't the same as the vendor acting, so a renewal stays open until its outcome is confirmed.
- **Settings and the AI assistant as supporting context only.** The core flow doesn't depend on them, and the settings pages have been removed to keep the prototype focused.

## Sources in this repo

- Brief: `FRAMING-MEMO.md`, `CORE-FLOW.md`
- Flow and rules: `src/features/renewal-risk/`
- Owner view: `src/features/owner-view/`
