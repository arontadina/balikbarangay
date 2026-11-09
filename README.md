# BalikBarangay – Post-Calamity Recovery Tracker

A mobile-first, installable web app (PWA) for reporting post-disaster damage, tracking each report
as a case from submission to closure, and showing privacy-safe community progress.
It implements the **MVP scope** of the BalikBarangay project proposal.

**Stack:** Next.js 14 (React, TypeScript) · Tailwind CSS · Supabase (PostgreSQL, Auth, private Storage) · hosted on Vercel.
Everything below can be done on free tiers for a pilot.

> **Not an emergency service.** The app must never replace 911 / the barangay DRRM hotline, and a
> submitted report is not an official finding until verified by authorized staff.

---

## 1. What is included (MVP)

| Proposal item | Where it lives |
|---|---|
| Resident sign-in, minimal profile | `src/app/login`, `profiles` table |
| Submit report: category, description, purok, landmark, GPS pin, photos | `src/app/report/new` |
| Unique tracking number + receipt | DB trigger `set_tracking_code` (e.g. `BB-2611-00042`) |
| My reports + timeline of resident-visible updates | `src/app/reports`, `src/app/cases/[id]` |
| Staff case inbox with filters, "needs attention" flags, CSV export | `src/app/staff` |
| Verification (confirmed / needs info / rejected) with findings | Staff panel in `cases/[id]` + `verifications` table |
| Priority with recorded rationale (internal note) | Staff panel |
| Assignment / referral, next action, target date | Staff panel |
| Status management with timestamp, user, reason | Staff panel + `case_updates` |
| Before/during/after photo evidence | `case_media`, private storage bucket |
| Unassigned and inactive-case flags (reminders for review) | `INACTIVE_DAYS` in `src/lib/constants.ts` |
| Audit trail | `audit_logs` table filled by a database trigger |
| Role management (resident, encoder, verifier, admin) | `src/app/staff/users` |
| Privacy-safe public dashboard (small groups < 3 hidden) | `src/app/dashboard`, `public_summary()` SQL function |
| Local drafts + offline-labelled warnings, image compression | `report/new`, `src/lib/image.ts`, `public/sw.js` |

**Role rules enforced in the database (not just the UI):** only verifiers/admins can mark a case
*verified* or *not accepted*; only admins can *close* a case; closing/rejecting requires a reason;
residents can only see their own cases; internal notes are hidden from residents; only admins
can change roles.

**Deliberately left for Phase 2** (as in the proposal): household recovery scorecard, assistance
history, duplicate detection, resident "still unresolved" feedback, push/SMS notifications, public
map, analytics, offline sync of submissions. The schema is ready to extend.

---

## 2. Run it on your computer (about 10 minutes)

**Prerequisites:** Node.js 18.18+ (20 or 22 recommended) and a free Supabase account.

### Step A – Create the Supabase project
1. Go to <https://supabase.com> → **New project**. Pick a name (e.g. `balikbarangay`), set a database
   password, choose the region closest to you (Singapore works well for the Philippines).
2. When it finishes provisioning, open **SQL Editor → New query**.
3. Paste the whole contents of `supabase/schema.sql` and click **Run**. It should end with *Success*.
   This creates the tables, security rules, triggers, the private `case-media` storage bucket,
   and 7 sample puroks (rename them in **Table Editor → puroks** to match your barangay).
4. Go to **Project Settings → API** and copy the **Project URL** and the **anon public** key.
5. (Pilot convenience) **Authentication → Providers → Email**: you may turn off *Confirm email* while
   testing. Turn it back **on** for real use.

### Step B – Configure and start the app
```bash
cd balikbarangay
npm install
cp .env.example .env.local        # Windows: copy .env.example .env.local
# edit .env.local and paste your Project URL and anon key
npm run dev
```
Open <http://localhost:3000>. To test on your phone on the same Wi-Fi, open
`http://<your-computer-ip>:3000`.

### Step C – Make yourself the first administrator
1. In the app, **Create an account** with your email.
2. In Supabase **SQL Editor**, run (use your email):
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
3. Sign out and back in. You now see the staff **Inbox** and **Users** tabs.
4. From **Users**, promote other accounts to *Encoder*, *Verifier* or *Administrator*.

### Quick test of the whole workflow
1. Create a second account (use a private window) → **New report** with a photo → note the tracking number.
2. As admin: **Inbox** → open the case → *Record verification* → *Priority* → *Assign / refer* →
   *Update status* (add a resident-visible note) → *Add photo evidence* → close with a reason.
3. As the resident: open **My reports** and watch the status and timeline update.
4. Open **Progress** (or the public link on the home page) to see the aggregate dashboard.

---

## 3. Deploy to the internet (Vercel, free tier)

1. Create a GitHub repository and push this folder:
   ```bash
   git init
   git add .
   git commit -m "BalikBarangay MVP"
   git branch -M main
   git remote add origin https://github.com/<you>/balikbarangay.git
   git push -u origin main
   ```
   (`.env.local` is git-ignored, so your keys are not uploaded.)
2. Go to <https://vercel.com> → **Add New → Project** → import the repository. Framework is detected as Next.js.
3. Under **Environment Variables** add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**. You get a URL such as `https://balikbarangay.vercel.app`.
5. Back in Supabase → **Authentication → URL Configuration**, set **Site URL** to your Vercel URL
   (add it to Redirect URLs too) so confirmation emails link to the live site.
6. Optional: add a custom domain in Vercel → Project → Settings → Domains.

Every `git push` redeploys automatically.

---

## 4. Install on a phone (it behaves like a mobile app)

- **Android (Chrome):** open the site → menu (⋮) → **Install app** / **Add to Home screen**.
- **iPhone (Safari):** open the site → Share → **Add to Home Screen**.

It opens full-screen with its own icon. The service worker lets the app shell open on weak signal;
case data always comes live from the server, so submitting a report needs a connection (the form keeps
a local text draft and clearly says when a report was *not* sent).

### Want an Android APK / Play Store listing later?
Wrap the deployed PWA without rewriting it: use **PWABuilder** (<https://www.pwabuilder.com>) or
**Bubblewrap** to produce a Trusted Web Activity APK/AAB. For an iOS App Store build, wrap with
**Capacitor**. Do this only after the pilot shows a need (as the proposal recommends).

---

## 5. Project structure

```
balikbarangay/
├─ supabase/schema.sql        # tables, RLS security, triggers, storage policies, public_summary()
├─ public/                    # manifest.json, sw.js (service worker), icons
└─ src/
   ├─ app/
   │  ├─ page.tsx             # landing / role redirect
   │  ├─ login/               # sign in + sign up
   │  ├─ report/new/          # resident report form (draft, GPS, photos)
   │  ├─ reports/             # resident's own cases
   │  ├─ cases/[id]/          # case detail + timeline (+ staff actions for staff)
   │  ├─ staff/               # staff inbox, filters, CSV export
   │  ├─ staff/users/         # admin: roles & deactivation
   │  └─ dashboard/           # public/privacy-safe summary
   ├─ components/             # AuthProvider, Shell (header + bottom nav), badges
   └─ lib/                    # supabase client, types, constants (categories, statuses), image compression
```

## 6. Customizing for your barangay

- **Categories:** edit `CATEGORIES` in `src/lib/constants.ts` **and** the `category` check constraint in `schema.sql`.
- **Statuses / inactive threshold:** `STATUSES` and `INACTIVE_DAYS` in `src/lib/constants.ts` (status list also in the SQL check constraint).
- **Puroks:** rename or add rows in Supabase **Table Editor → puroks**.
- **Public-dashboard privacy threshold (3):** `having count(*) >= 3` inside `public_summary()`.
- **Colors / name:** `tailwind.config.js`, `public/manifest.json`, `src/app/layout.tsx`.

## 7. Before using with real residents (from the proposal's governance section)

This code is a working prototype, **not** a hardened production system. Before collecting real data:

- [ ] Get written authorization from the barangay/LGU and identify who is the personal-information controller (and the developer's role).
- [ ] Complete a privacy impact assessment and publish a privacy notice; consult the LGU's Data Protection Officer (NPC guidance: <https://privacy.gov.ph>).
- [ ] Agree the categories, status definitions, priority rubric and who may verify/close cases.
- [ ] Turn **email confirmation on**; consider Supabase Pro for automated backups; test a restore.
- [ ] Run the permission tests (resident cannot see others' cases; encoder cannot verify/close; volunteer sees only assigned data when you add that role) and a security review.
- [ ] Define retention/deletion rules for photos and closed cases; set up an incident-response contact.
- [ ] Provide a non-digital reporting route (barangay desk encoding) so no one is excluded.
- [ ] Use synthetic data only until the above is signed off.

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| "Missing NEXT_PUBLIC_SUPABASE_URL…" | `.env.local` missing/misnamed; restart `npm run dev` after editing. On Vercel, add the env vars and redeploy. |
| Sign-up works but the profile doesn't load | `schema.sql` didn't finish. Re-run it (it is safe to re-run). |
| "new row violates row-level security policy" on submit | Account is deactivated, or `schema.sql` was not run fully. |
| Photos fail to upload | Check the `case-media` bucket exists (Storage) and the storage policies ran. |
| Can't see Inbox after promoting yourself | Sign out and back in; confirm the `update … set role = 'admin'` affected 1 row. |
| Confirmation emails not arriving | Supabase's built-in mailer is rate-limited; configure custom SMTP or disable confirmation for testing only. |
| Build error on Vercel | `next.config.js` currently ignores type/lint errors so deploys don't fail; run `npm run build` locally to see real warnings. |
