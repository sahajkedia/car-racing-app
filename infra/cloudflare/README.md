# Cloudflare + Netlify deployment

This branch is prepared for a low-cost setup:

- Frontend on Netlify
- API traffic routed through a Cloudflare Worker gateway
- Existing Go API remains your origin service

## How it works

1. Browser calls `https://<netlify-site>/api/...`
2. Netlify redirects `/api/*` to your Worker domain
3. Worker forwards to your origin API (`ORIGIN_API_BASE_URL`)

## Files in this folder

- `wrangler.toml`: Worker configuration
- `src/index.js`: Worker gateway/proxy

## Setup

1. Install Wrangler:
   - `npm i -g wrangler`
2. Update `wrangler.toml`:
   - `ORIGIN_API_BASE_URL`: your real backend origin (no trailing slash)
   - `ALLOWED_ORIGINS`: your Netlify URL
3. Deploy Worker:
   - `cd infra/cloudflare`
   - `wrangler deploy`
4. Update `apps/web/netlify.toml`:
   - Replace `REPLACE_WITH_WORKER_DOMAIN.workers.dev` with your actual Worker domain
5. Deploy Netlify site.

## Notes

- This does not migrate the Go API runtime to Cloudflare Workers.
- It reduces browser-to-origin coupling and can lower direct backend traffic.
