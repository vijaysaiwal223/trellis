# Trellis renewal decisions

A prototype that stops surprise renewals: a queue sorted by decide-by (renewal date minus notice period), with owner recommendations, the lead's decision, written notice and confirmed outcomes.

- Brief: [FRAMING-MEMO.md](FRAMING-MEMO.md) and [CORE-FLOW.md](CORE-FLOW.md)
- Prototype memo: [PROTOTYPE-MEMO.md](PROTOTYPE-MEMO.md)

## Run

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # unit tests
npm run build   # production build
```

Bruno (the AI assistant) needs `GEMINI_API_KEY` in `.env.local`. Without it, Bruno shows an offline summary.

## Layout

- `src/app` — routes: the queue (`/`), the owner's view (`/owner`, `/owner/[slug]`), and the Bruno API route.
- `src/features/renewal-risk` — deadlines, assessment, the queue and its drawers.
- `src/features/owner-view` — the owner's dashboard and decision drawer.
- `src/components` — shared UI: alert, stepper, seat gauge, Bruno button and layout.
- `src/lib` — the clock, dates, browser-local runtime state and vendor slugs.

State lives in the browser on one device. Nothing is sent to owners or vendors.
