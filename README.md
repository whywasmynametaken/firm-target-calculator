# Firm Target Calculator

A monthly overhead allocation and revenue target calculator for firm planning.
The hosted version uses Sites-managed D1. The repository also includes a Docker
Compose file for TrueNAS/self-hosted deployments.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## TrueNAS / Docker Compose

The root `docker-compose.yml` can be imported as a TrueNAS custom app YAML. It
pulls the prebuilt image from GitHub Container Registry and exposes the app on
host port `3020`.

Before launching, change these environment values in `docker-compose.yml`:

- `AUTH_SECRET`: a long random string used to sign login sessions.
- `OWNER_SETUP_CODE`: the one-time code used to create the owner account.
- `COOKIE_SECURE`: keep `false` for plain HTTP on your LAN. Change to `true`
  when serving the app only over HTTPS.

The first time the app starts, open it in a browser and create the owner login:

- Email: `drewbo17@gmail.com`
- Setup code: the `OWNER_SETUP_CODE` value from the YAML
- Password: at least 10 characters

The container stores local runtime database state in the
`firm-target-calculator-data` volume. Keep that volume when upgrading the app.

```bash
docker compose up -d
```

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` defines the shared calculator and app-user tables
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
