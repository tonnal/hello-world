# AffiliateKaro (MVP)

Phase 1 implemented:
- Merchant signup/login (email + password)
- Organization isolation (1 merchant = 1 organization)
- Program CRUD (create/list/delete)

Phase 2 implemented:
- Affiliate management per program (invite/create, approve/suspend/reject)
- Ref codes per affiliate
- Click tracking endpoint + public `tracker.js`

## Local setup

1) Install deps

```bash
npm install
```

2) Configure env

```bash
cp .env.example .env
```

Set:
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

3) Apply database schema

```bash
npx prisma migrate dev --name init
npx prisma generate
```

4) Run

```bash
npm run dev
```

Then visit:
- `/signup`
- `/login`
- `/dashboard/programs`

## Tracking script (MVP)

Embed on the merchant website:

```html
<script src="https://YOUR_APP_DOMAIN/tracker.js"></script>
```

It reads `?ref=CODE` or `?via=CODE`, logs a click, and writes a cookie:
- `ak_attrib = affiliateId.programId.timestamp`
