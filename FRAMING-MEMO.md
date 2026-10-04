# Framing memo — prevent surprise renewals

## Problem

Trellis has contract facts, but a renewal can still proceed without a decision. Three things combine: the last day to cancel is earlier than the renewal date, auto-renew makes silence costly, and roughly 15% of subscriptions have no active owner. Another dashboard or calendar would show the risk without ensuring someone handles it.

## User and accountability

**Finance/procurement is accountable for the outcome.** A tool owner supplies the usage decision because they know whether the team still needs the product and how many seats it needs. Finance assigns an owner, watches unanswered requests, takes over near cancel-by, and confirms the result with the vendor. This division is an assumption to validate with a customer; it is explicit in the prototype.

## Chosen approach

Use a ranked action queue keyed to **cancel-by = renewal date − notice period**. At 30 days before cancel-by, ask the owner to Renew, Downsize, Cancel, or say “Not mine” through a short link. At 14 days, remind the owner and show finance the unanswered item. At 7 days, finance becomes responsible for the next action. A recorded choice stays open until someone confirms the vendor outcome. If cancel-by has passed, the interface offers recovery options instead of promising ordinary cancellation.

The prototype has a labelled date walkthrough so a reviewer can inspect these states without waiting for real time. The owner message is a preview; no external message is sent. Browser-local state lets the owner page, finance queue, and detail screen reflect the same demo decision on one device.

## Tradeoffs and data

I chose a decision and escalation path over a calendar, more generic alerts, or a broad Trellis redesign. Settings and the AI assistant are supporting prototype context; they are not required to complete the core flow. No backend, authentication, or vendor integration is needed to demonstrate it.

The core flow uses the brief's contract facts. **Owner team** is one additional field to explain assignment and handoff. The prototype uses the current seat snapshot from the brief and does not assume historical usage. Calculated values are labelled as estimates. Where the imported source says “Negotiated,” renewal behavior stays **unverified** until terms are checked; it is not counted as known auto-renewal.

## Success measure

Track the share of renewals with a confirmed outcome before cancel-by, surprise renewals with no recorded decision, time from first request to decision, and the share requiring finance takeover. The goal is zero surprise renewals, not more dashboard views.
