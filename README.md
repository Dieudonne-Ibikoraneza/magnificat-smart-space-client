# Magnificat Smart Space — frontend

The bilingual Next.js application for the storefront, inventory, orders,
analytics, AI recommendations, and 3D room visualizer.

## Docker deployment

Install Docker Engine and Docker Compose v2. Deploy in this order:
**[database](../database/README.md#deploy) → [storage](../storage/README.md#deploy)
→ [backend](../server/README.md#production-docker) → frontend**.
Docker installs dependencies and builds Next.js standalone output, including
the public assets, 3D room models, and `.next/static` files.

1. **Create the environment file.** From the workspace root:

   ```sh
   cd client
   ./docker.sh --init-env
   ```

   For an existing installation, keep `.env.docker` and skip `--init-env`.
   Configure it using `.env.docker.example`:

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_URL` | Browser-facing API URL including `/api/v1`, such as `https://api.example.com/api/v1` |
   | `API_URL` | Internal image-proxy URL; default `http://backend:4000/api/v1` |
   | `BACKEND_NETWORK` | Same network as the backend; default `magnificat-backend` |
   | `FRONTEND_NETWORK` | Frontend network; default `magnificat-frontend` |
   | `FRONTEND_BIND_ADDRESS` | Host bind address; default `127.0.0.1` |
   | `FRONTEND_PORT` | Host port; default `3000` |

   `NEXT_PUBLIC_API_URL` is embedded in browser code during the build, so it
   must be reachable by the user's browser. `API_URL` is used only inside the
   frontend container to fetch private images through the backend. The
   frontend joins `BACKEND_NETWORK` so Docker DNS can resolve `backend`.
   Set backend `CORS_ORIGINS` and `CLIENT_URL` to the frontend's public origin.

2. **Validate, build, and start.** From `client/`:

   ```sh
   ./docker.sh --config
   ./docker.sh --up
   ./docker.sh --status
   ```

   The wrapper builds the image, starts the container, and waits for health.
   The application listens on container port `3000`; `FRONTEND_PORT` controls
   the host mapping. For production, route an HTTPS reverse proxy to the
   frontend and backend as described in [DOCKER.md](../DOCKER.md).

3. **Verify the deployment.** `./docker.sh --status` should show a healthy
   frontend. With the default host port:

   ```sh
   curl --fail http://localhost:3000/api/health
   ```

   Open `http://localhost:3000/en` and check login, catalogue images, and the
   visualizer. The current local Docker test deployment uses
   **[localhost:3001/en](http://localhost:3001/en)** and the browser-facing API
   **`http://localhost:4001/api/v1`**. Its internal `API_URL` remains
   `http://backend:4000/api/v1`. See [DOCKER-LOCAL.md](../DOCKER-LOCAL.md) for
   the test account emails and OTP.

4. **Update and manage the stack.** From `client/`:

   ```sh
   ./docker.sh --up                 # Rebuild and apply source/environment changes
   ./docker.sh --up --no-build      # Start using the existing image
   ./docker.sh --build              # Build without starting
   ./docker.sh --logs --follow
   ./docker.sh --restart
   ./docker.sh --stop
   ./docker.sh --down
   ```

   Rebuild whenever `NEXT_PUBLIC_API_URL` changes. `--restart` restarts the
   existing container; `--up` applies new configuration. `--down` preserves
   the shared backend network and other projects' data. `--env-file PATH`
   selects a custom configuration. Use `./docker.sh --help` for all flags.

The image runs as `node`; `docker-entrypoint.sh` forwards shutdown signals
directly to the application. Keep `.env.docker` private and outside Git.

## Local development

From `client/`, install dependencies with `npm ci`. Create `.env.local` with:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

Start the backend, then run `npm run dev` and open
`http://localhost:3000/en`. Use the actual backend host port if it differs.
Docker images use Node.js 22.

## Checks

From `client/`:

```sh
npm run lint
npm run build
npm run test:product-validation
npm run test:invoice-print
npm run test:tile-analytics
```

[DOCKER-TEST-RESULTS.md](../DOCKER-TEST-RESULTS.md) records the Docker, database,
storage, API, and frontend checks completed for the local deployment.
