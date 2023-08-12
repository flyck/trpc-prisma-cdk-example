# Prisma + tRPC + AWS CDK

The awesome trpc + prisma starter combo but with the AWS CDK infrastructure ontop.

## Features

- 🧙‍♂️ E2E typesafety with [tRPC](https://trpc.io)
- ⚡ Full-stack React with Next.js
- ⚡ Database with Prisma
- ☁ AWS CDK Stack
- ⚙️ VSCode extensions
- 🎨 ESLint + Prettier
- 💚 CI setup using GitHub Actions:
  - ✅ E2E testing with [Playwright](https://playwright.dev/)
  - ✅ Linting
- 🔐 Validates your env vars on build and start

## Setup

- Clone this repo
- Start the local Dockerfile for local development
```bash
docker build -t my-postgres-image .
docker run -p 5432:5432 my-postgres-image
```
- Install and run
```bash
pnpm
pnpm dx
```
- Deploy to AWS
  - move into the stack directory
  - fill out the cdk.json according to your AWS account
  - Deploy the infrastructure (you might want to limit network access)
```bash
yarn install
AWS_PROFILE=personal yarn deploy:infra
# push your schema to the fresh database
cd ..
DATABASE_URL="postgres://postgres:psst@trpc-prisma-cdk.123.eu-central-1.rds.amazonaws.com/main" npx prisma db push
cd stack
AWS_PROFILE=personal yarn deploy:frontend
```
  - Browse to your url and enjoy!

### Requirements

- Node18
- Postgres

## Development

### Commands

```bash
pnpm build      # runs `prisma generate` + `prisma migrate` + `next build`
pnpm db-reset   # resets local db
pnpm dev        # starts next.js
pnpm dx         # starts postgres db + runs migrations + seeds + starts next.js
pnpm test-dev   # runs e2e tests on dev
pnpm test-start # runs e2e tests on `next start` - build required before
pnpm test:unit  # runs normal Vitest unit tests
pnpm test:e2e   # runs e2e tests
```

## Deployment

### Using [Render](https://render.com/)

The project contains a [`render.yaml`](./render.yaml) [_"Blueprint"_](https://render.com/docs/blueprint-spec) which makes the project easily deployable on [Render](https://render.com/).

Go to [dashboard.render.com/blueprints](https://dashboard.render.com/blueprints) and connect to this Blueprint and see how the app and database automatically gets deployed.

## Files of note

<table>
  <thead>
    <tr>
      <th>Path</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="./prisma/schema.prisma"><code>./prisma/schema.prisma</code></a></td>
      <td>Prisma schema</td>
    </tr>
    <tr>
      <td><a href="./src/pages/api/trpc/[trpc].ts"><code>./src/pages/api/trpc/[trpc].ts</code></a></td>
      <td>tRPC response handler</td>
    </tr>
    <tr>
      <td><a href="./src/server/routers"><code>./src/server/routers</code></a></td>
      <td>Your app's different tRPC-routers</td>
    </tr>
  </tbody>
</table>

---

Created by [@alexdotjs](https://twitter.com/alexdotjs).
