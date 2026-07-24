# SwasthSetu architecture

SwasthSetu is organised as a small monorepo. The static web application is in `apps/web`, while the NestJS and Prisma backend remains independently runnable in `apps/backend`.

The frontend server in `scripts/serve-frontend.cjs` maps the established browser URLs to their modular source locations. This preserves the existing landing page, login popup workflow, dashboard URLs, API calls, and role guards without a framework migration.

## Web portals

- `public-portal`: public landing behaviour and styles.
- `patient-portal`: patient dashboard shell.
- `doctor-portal`: doctor dashboard shell, styles, and clinical workspace script.
- `hospital-portal`: hospital dashboard shell.
- `shared`: UI styles and scripts used by more than one portal.

## Backend

`apps/backend` contains NestJS modules, Prisma schema and migrations, and the local Docker configuration. Existing API paths remain unchanged. Domain folders under `src/modules` reserve clear boundaries for future patient, doctor, hospital, queue, bed, blood bank, lab report, and notification features.
