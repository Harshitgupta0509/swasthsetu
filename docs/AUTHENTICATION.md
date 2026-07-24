# Authentication and access flow

1. The public site opens the patient or staff authentication dialog in a separate named portal window after successful authentication.
2. Patient credentials open `/patient/dashboard/`.
3. Staff select Doctor or Hospital access. Doctor credentials open `/doctor/dashboard/`; hospital administrator credentials open `/hospital/dashboard/`.
4. `portal-guard.js` validates the browser token and role before a dashboard loads. It redirects unauthorised users to `/login/` or `/staff-login/`.

The browser URLs and backend API contracts were preserved during the folder refactor.
