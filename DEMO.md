# SwasthSetu Demo Guide

## Start the demo

```powershell
cd "C:\Users\harsh\Desktop\hackathon project\apps\backend"
docker compose up -d
pnpm prisma:migrate
pnpm prisma:seed
pnpm build
pnpm start
```

Open `C:\Users\harsh\Desktop\hackathon project\index.html` in a browser.

## Demo accounts

- Hospital Admin: `HA-1001` / `ChangeMe123!`
- Doctor: `DR-1001` / `ChangeMe123!`
- Patient: `9000000001` (request an OTP; the development OTP is displayed in the login dialog)

## Suggested 2-minute workflow

1. Sign in as Hospital Admin.
2. Open **Appointment Management** or use **Create appointment** on the dashboard.
3. Choose a patient and doctor, set the time and create the appointment. A token is generated.
4. Sign in as the Doctor. The appointment appears in the live queue. Select **Start**, then **Complete**.
5. Sign in as the patient. The updated appointment status and notification appear in the Patient Dashboard.

## Local services

- Frontend: static local HTML files
- API: `http://127.0.0.1:3000/api/v1`
- PostgreSQL: port `5432`
- Redis: Docker-assigned port `6542`

This demo uses a development OTP provider. Kapso/WhatsApp can be connected later without changing the appointment workflow.