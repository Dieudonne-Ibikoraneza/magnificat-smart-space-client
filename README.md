This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

For production Docker:

Use `./docker.sh --init-env`, fill `.env.docker`, and run `./docker.sh --up`
to build and start the frontend, waiting for a healthy container. Use
`./docker.sh --help` to see flags for building, logs, status, restart, stop,
and custom environment files. The image starts through `docker-entrypoint.sh`
and forwards shutdown signals directly to Node.

```sh
cp .env.docker.example .env.docker
# Set NEXT_PUBLIC_API_URL to your browser-facing API URL, including /api/v1.
docker compose --env-file .env.docker -f compose.production.yaml up -d --build
```

The frontend runs from Next.js standalone output and includes `public/`
assets and `.next/static`. Rebuild when changing `NEXT_PUBLIC_API_URL`.
See [the workspace Docker guide](../DOCKER.md) for deploying both applications
and connecting the separately managed database and storage.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
