# Framing Memo — Renewal Risk

## The real problem

Trellis isn't failing at visibility — it's failing at **forcing a decision before the default outcome fires**. The data was "technically" there; nobody was made to act on it in time. Three compounding failures, not one:

- **Auto-renew has a dangerous default.** Manual and month-to-month contracts need action to *continue*; auto-renew needs action to *stop*. Silence — the easiest thing to do — is catastrophic only for auto-renew. Trellis currently treats all three the same.
- **The deadline that matters is hidden.** Users think in terms of the *renewal date*. The date that actually requires action is the *cancel-by* date — renewal date minus notice period (30/60/90 days) — which is earlier and never shown as the headline. The Salesforce case ("found out two days after it fired") is a cancel-by miss, not a renewal-date miss.
- **~15% of tools have no owner, and ownership silently rots** (people leave, roles change). A dashboard someone *could* check doesn't help when there's no "someone."

More alerts, a calendar, or a prettier dashboard are all symptom-level fixes: they still rely on a human choosing to look, on their own schedule, at data that doesn't distinguish urgency. None of them force resolution or handle the no-owner case.

## Who I'm designing for

The **subscription owner** — the internal person accountable for one tool (Rohan in Engineering, etc.) — not the finance/procurement admin who bought Trellis. The admin already has visibility; the owner is the one who needs to be interrupted at the right moment and given a fast way to resolve. If the flow works for the owner, the admin's rollup view is a natural byproduct.

## The approach: a forced decision queue, not another view

Reframe "Renewal Risk" from a table you *can* read into a queue you *must* clear:

1. **Rank by real urgency**, not calendar order: `days-to-cancel-by × contract value × auto-renew risk × ownership gap`. A $96K auto-renew with no owner and 6 days of notice left outranks a $500K manual renewal 90 days out.
2. **Surface cancel-by, not renewal date**, as the primary date, with days-late called out explicitly in red — the moment already missed is the moment most likely to repeat.
3. **Give every row a required status** (Assign owner → In review → On track / Needs decision), not just a "view" link — the row can't quietly stay in a neutral state.
4. **Resolve in place**: clicking the action opens the decision (Renew / Cancel / Escalate) directly in the queue — a review shouldn't require leaving Trellis to find context.
5. **Escalate on silence**: unowned items, or items with no action inside a threshold of their cancel-by date, auto-route to the owner's manager — this is the fix for the departed-owner case, and it's the one piece "assign owners more aggressively" alone can't do.

## What I explicitly cut

- **Navigation, settings, onboarding** — untouched; nothing about this problem requires them.
- **A standalone renewals calendar** — rejected as a concept, not just unbuilt: it's the same passive-visibility failure in a different layout.
- **Notification/email redesign** — the escalation *logic* is specified above; the email/Slack surface it rides on is out of scope for one day of work.
- **Subscriptions list, owner directory, activity log** — real screens in the full product, not needed to demonstrate this fix.
- **Persona docs, journey-map artifacts, competitive teardown** — didn't earn a decision here; cut per the brief's own guidance.
- **The AI assistant** — scoped as the stretch goal only (see below), not load-bearing for the core fix. The queue must work without it.

## Two added fields (the brief's cap)

- **Owner's team** (e.g. "Engineering") — the minimum needed to answer "who do we escalate to if this owner doesn't act."
- **Monthly active-seat history** (6 months, behind the Overview tab's usage-trend chart) — the brief's data model already has "active seats" sourced from SSO logs; SSO activity is inherently a time series, not a single read, so a monthly history is a plausible extension of a field Trellis already has, not a new kind of data.

Everything else on screen (risk, cancel-by, timing, status) is derived from the given fields, not new data.

## AI assistant (stretch)

If included: the assistant pre-fills the Escalate/Renew/Cancel decision with a recommendation and its reasoning ("Escalating — no owner, 6 days past cancel-by, usage 85%"), but never executes it. The human still clicks. Confidence and the specific signals used are shown inline, not hidden behind a chat window.
