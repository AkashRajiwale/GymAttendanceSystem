# Varasgav Fitness — Attendance & Fees

A mobile web app for the gym:

- **QR attendance**: members scan the QR poster at the entrance. The first scan of a visit checks them in, and the next scan checks them out.
- **One-time sign-up**: name and mobile number. After that the member stays logged in on that phone until they log out.
- **Add for someone else**: mark a friend who has no phone with them, and check them out later.
- **Time corrections**: a member can change their in time for 1 hour after scanning (up to 1 hour earlier). The out time can be set to any time within the last 2 hours.
- **Fees**: members see the gym's UPI QR, whether this month is paid, and their payment history. The admin records payments.
- **Admin** (`/admin`): daily attendance list, a PDF report for the WhatsApp group, manual corrections, payments, unpaid list with WhatsApp reminders, members, and the QR poster.

Data is stored in a **Google Sheet**, so you can open it like Excel or download it as `.xlsx` at any time. The app creates these tabs automatically:

| Tab | Contents |
| --- | --- |
| `Members` | phone, name, joined date |
| `Attendance 2026-10` (one per month) | date, name, phone, in/out time, who added it |
| `Payments` | member, month, amount, paid on, mode, note |

> Do not rename tabs or reorder columns. You can sort or filter the rows freely.

---

## 1. Run it on your computer

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. If no Google Sheet is configured, data goes to `.data/db.json` so you can try everything first. The admin password defaults to `admin` locally.

## 2. Set up the Google Sheet (one time, free)

1. Go to <https://console.cloud.google.com> → create a project (e.g. "gym-app").
2. **APIs & Services → Library** → enable **Google Sheets API**.
3. **APIs & Services → Credentials → Create credentials → Service account**. Give it any name, then click **Done**.
4. Open the service account → **Keys → Add key → Create new key → JSON**. A JSON file downloads.
5. Create a new Google Sheet (e.g. "Varasgav Fitness Data"). Click **Share** and add the service account's email (`...@...iam.gserviceaccount.com`) as an **Editor**.
6. Copy `.env.example` to `.env.local` and fill in:
   - `GOOGLE_SHEET_ID`: the long ID in the sheet URL, `docs.google.com/spreadsheets/d/<THIS PART>/edit`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: `client_email` from the JSON
   - `GOOGLE_PRIVATE_KEY`: `private_key` from the JSON, in quotes, keeping the `\n`s
   - `ADMIN_PASSWORD`, `SESSION_SECRET`, `GYM_QR_KEY`, `MONTHLY_FEE`

## 3. Deploy free on Vercel

1. Push this folder to a GitHub repository.
2. On <https://vercel.com> → **Add New → Project** → import the repo (framework: Next.js, no other settings).
3. Under **Settings → Environment Variables**, add every variable from your `.env.local`. Set `APP_URL` to your final address, e.g. `https://varasgavfitness.vercel.app` or your own domain.
4. Deploy. To use your own domain, go to **Settings → Domains**.

## 4. Before opening day

- **UPI scanner**: save your UPI QR image as `public/upi-qr.png`, then commit and redeploy.
- **QR poster**: go to `/admin` → **QR poster** → **Print poster**, and stick it at the entrance. If you change `GYM_QR_KEY` or the domain, print a new one.

## 5. Daily routine

- **10 PM report**: on the admin's phone, open `/admin` → **Attendance** → **Share PDF** → pick the gym WhatsApp group. **Send as text** posts the same list as a message. WhatsApp doesn't allow apps to post into groups automatically for free, so this one tap is manual.
- **Fees**: when someone pays, go to **Fees → Record a payment**. Use **Remind** in the "Not paid yet" list to send a WhatsApp reminder.

## Notes

- All times are India time (IST).
- A second scan within 3 minutes of checking in is ignored, so a double scan doesn't check you out.
- Visits with no out time show as "inside" or "—" in the report. The admin can fill them in.
- Rules are in `src/lib/rules.ts` and storage is in `src/lib/store.ts` / `src/lib/db.ts`.
