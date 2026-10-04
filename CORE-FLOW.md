# Core flow — one renewal, two possible paths

**Primary actor:** finance/procurement owns the outcome. The tool owner answers whether the product is needed and at what seat count. **Primary date:** cancel-by, calculated from renewal date minus notice period.

## Main path: Microsoft 365

The demo contract is $156,000 annually, 604 of 650 seats active (93%), renews Dec 31, and has a 90-day notice period. Its cancel-by date is **Oct 2**. The dates below are selectable in the prototype's “Walk through a missed response” control.

| Frame | Moment and surface | Visible message | Next action |
| --- | --- | --- | --- |
| 1 | T−30 · owner message preview, Sep 2 | “Microsoft 365 renews for $156,000. Cancel by Oct 2. 604/650 seats active.” | Renew, Downsize, Cancel, Not mine |
| 2 | Owner decision page | Key contract facts, chosen action, optional note; Downsize asks for a target seat count. | Submit decision |
| 3 | T−14 · finance queue, Sep 18 | “Owner reminder · finance watching.” Owner is still expected to answer; finance can see the overdue decision. | Review or remind |
| 4 | T−7 · finance queue, Sep 25 | “Finance takeover: decide renewal.” The next action and responsible party change. | Decide now |
| 5 | Finance decision dialog | Cancel-by, annual value, usage, YoY change, three decisions, and the responsible person. | Record decision |
| 6 | Outcome pending · detail and queue | “Decision recorded” with a follow-up date. The risk remains open until the vendor outcome is confirmed. | Contact vendor, then confirm outcome |
| 7 | Handled · queue and detail | Outcome confirmed, with who recorded it and when. | Review audit trail |
| 8 | Missed-window recovery · Oct 3 | The ordinary cancellation window has passed. Options become negotiate downsize, request goodwill cancellation, or accept renewal. | Record recovery choice and vendor follow-up |

Frame 2 branches around frames 3–5 when the owner responds on time. Frames 3–5 show what happens when the owner stays silent. Frame 8 branches from an unhandled item after Oct 2.

## Missing-owner branch: Asana

Asana is $33,600 annually, 113 of 240 seats active (47%), renews Dec 31, and has a 60-day notice period. It has no owner and a Nov 1 cancel-by date. Finance first sees **Assign an owner**. The assignment picker shows a suggested colleague and the evidence used. Once assigned, the owner can receive the message preview. If nobody is assigned near cancel-by, finance retains the action and the queue calls for a recovery owner. The prototype does not send a message or infer seat-holder activity that is absent from the source data.

## Prototype boundaries

The date walkthrough simulates passage of time; it does not schedule or deliver notifications. The owner link and queue share browser-local state on one device. A real product would need a shared backend, delivery service, access control, and proof of vendor action. Those are implementation steps beyond the assignment's prototype brief.
