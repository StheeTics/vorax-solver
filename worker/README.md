# Live-data collector

The Solver shares the boards it reads (see the main README). This Worker stores them so the simulator's
odds can be measured against the live game. It's a Cloudflare Worker with a D1 database, on Cloudflare's
free plan: nothing is billed, and if a daily limit is hit, uploads simply fail until midnight UTC.

- `POST /v1/icons`: one instrument icon a player named: the name and its 576-value grey pattern, nothing else.
- `GET /v1/icons/export?after=ID`: the same as the boards export, for icons.
- `POST /v1/snapshots`: 1 to 10 boards. Each is rebuilt from the fields the collector knows (card,
  instrument and protocol names from `src/names.json`, numbers within the engine's bounds); anything
  else is dropped. Retries can't make duplicates.
- `GET /v1/export?after=ID`: up to 5,000 rows after `ID`, for the repo's scheduled workflow. Needs the
  export token.
- `PUT /v1/summary`: the dashboard's numbers, worked out by the hourly workflow from every board
  (`scripts/live/summary.ts`): too much for one request on the free plan. Needs the export token.
- `GET /dashboard`, `GET /v1/stats`: the private analytics page and its numbers, the stored summary with the
  boards and players per day counted here. Needs the dashboard password (`DASHBOARD_TOKEN`).

No accounts and no addresses: each address may upload 60 times a minute and 1,500 boards a day, counted
against a salted hash that changes daily. Only the site (`https://tidewarden.github.io`, and `https://voraxlab.pages.dev`) may post from a browser.

## Setup (once, about 10 minutes)

Use the Cloudflare account for the tidewarden identity. Its `*.workers.dev` subdomain is public, so pick
a neutral one. From this folder, with Node 20+:

```
npx wrangler login
npx wrangler d1 create vorax-live            # put the printed database_id in wrangler.jsonc
npx wrangler d1 execute vorax-live --remote --file schema.sql
npx wrangler deploy                          # prints the Worker's URL
npx wrangler secret put EXPORT_TOKEN         # a long random string
npx wrangler secret put IP_SALT              # another long random string
```

Then, from the repo root:

```
gh secret set LIVE_DATA_TOKEN                # the same value as EXPORT_TOKEN
gh variable set LIVE_DATA_URL --body https://vorax-live.<your-subdomain>.workers.dev
```

and put the same URL in `src/solver/share/endpoint.ts` (`ENDPOINT`). The secrets live only in Cloudflare
and in GitHub's encrypted settings, never in the repo.

After labelling new protocol names, regenerate the accepted names with `npx vite-node scripts/live/names.ts`
and redeploy.
