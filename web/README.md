# Agentex Web Dashboard

Next.js dashboard for the Agentex market summary. It renders the four-agent exchange state from one of three sources:

- `AGENTEX_SUMMARY_URL` when set
- local Agentex API at `http://127.0.0.1:8787/api/summary` in development
- bundled `src/data/demo-summary.json` snapshot as fallback

## Run

```bash
npm install
npm run lint
npm run build
npm run dev
```

Open `http://localhost:3000`.

## Deploy

Deploy this `web/` directory as the Vercel project root. Set `AGENTEX_SUMMARY_URL` when the deployed app should read a public live summary instead of the bundled snapshot.
