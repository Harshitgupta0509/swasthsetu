# Folder structure and migration summary

## Current structure

```text
apps/
  web/
    public/                         # landing page, route login pages, legacy compatibility pages
    src/
      public-portal/
      patient-portal/
      doctor-portal/
      hospital-portal/
      shared/
  backend/                          # NestJS, Prisma, Docker and backend configuration
docs/
scripts/
```

## Moved files

| Previous location | New location |
| --- | --- |
| `index.html` | `apps/web/public/index.html` |
| `login/index.html` | `apps/web/public/login/index.html` |
| `staff-login/index.html` | `apps/web/public/staff-login/index.html` |
| `doctor/login/index.html` | `apps/web/public/doctor/login/index.html` |
| `hospital/login/index.html` | `apps/web/public/hospital/login/index.html` |
| `patient/dashboard/index.html` | `apps/web/src/patient-portal/pages/dashboard.html` |
| `doctor/dashboard/index.html` | `apps/web/src/doctor-portal/pages/dashboard.html` |
| `hospital/dashboard/index.html` | `apps/web/src/hospital-portal/pages/dashboard.html` |
| `styles.css` | `apps/web/src/public-portal/styles/styles.css` |
| `app.js` | `apps/web/src/public-portal/scripts/app.js` |
| `app.css` | `apps/web/src/shared/styles/app.css` |
| `internal-app.js` | `apps/web/src/shared/scripts/internal-app.js` |
| `portal-guard.js` | `apps/web/src/shared/scripts/portal-guard.js` |
| `doctor.css` | `apps/web/src/doctor-portal/styles/doctor.css` |
| `doctor-portal.js` | `apps/web/src/doctor-portal/scripts/doctor-portal.js` |
| `app.html` | `apps/web/src/shared/components/legacy-app-shell.html` |
| `doctor-portal.html` | `apps/web/src/doctor-portal/pages/legacy.html` |
| `login.html` | `apps/web/public/legacy/login.html` |
| `patient-login.html` | `apps/web/public/legacy/patient-login.html` |
| `doctor-login.html` | `apps/web/public/legacy/doctor-login.html` |
| `hospital-login.html` | `apps/web/public/legacy/hospital-login.html` |

## Compatibility

The static server deliberately retains all established URL paths, including the older standalone pages, by mapping them to their moved files. No duplicate tracked files were removed because the pre-refactor hash check found none that were byte-for-byte duplicates.
