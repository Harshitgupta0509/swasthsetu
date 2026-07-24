# SwasthSetu

Government Hospital Management Platform for public, patient, doctor, and hospital operations.

## Structure

- `apps/web`: modular static frontend source and public route files.
- `apps/backend`: NestJS API, Prisma schema, migrations, and Docker services.
- `docs`: architecture, authentication, features, and move-by-move migration notes.
- `scripts`: local development helpers.

## Run locally

```powershell
npm run frontend
```

Open `http://127.0.0.1:4173`.

For the API, start the backend from its own project:

```powershell
pnpm --dir apps/backend start:dev
```

See [docs/FOLDER_STRUCTURE.md](docs/FOLDER_STRUCTURE.md) for the portal mapping and compatibility routes.
