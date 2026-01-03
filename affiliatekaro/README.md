# AffiliateKaro (MVP)

Phase 1 implemented:
- Merchant signup/login (email + password)
- Organization isolation (1 merchant = 1 organization)
- Program CRUD (create/list/delete)

Phase 2 implemented:
- Affiliate management per program (invite/create, approve/suspend/reject)
- Ref codes per affiliate
- Click tracking endpoint + public `tracker.js`

Phase 3 implemented:
- Razorpay webhook endpoint (signature-verified) to create conversions + commissions

Phase 4/5 implemented (MVP dashboards):
- Merchant conversions dashboard (approve/reject)
- Merchant payouts dashboard (mark paid + reference)
- Public affiliate portal by `refCode`

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
- `/dashboard/conversions`
- `/dashboard/payouts`
- `/portal/{REFCODE}`

## Tracking script (MVP)

Embed on the merchant website:

```html
<script src="https://YOUR_APP_DOMAIN/tracker.js"></script>
```

It reads `?ref=CODE` or `?via=CODE`, logs a click, and writes a cookie:
- `ak_attrib = affiliateId.programId.timestamp`

## Razorpay webhook (MVP)

Set your webhook URL in Razorpay Dashboard to:
- `/api/webhooks/razorpay`

Configure env:
- `RAZORPAY_WEBHOOK_SECRET`

### Required notes/metadata (for attribution)

Because webhooks are server-to-server, Razorpay doesn’t know the browser cookie unless your checkout passes it.
When you create a Razorpay **Order** / **Payment**, include **notes**:

- `ak_org`: your AffiliateKaro `organizationId`
- Either:
  - `ak_attrib`: the cookie value `ak_attrib` (format: `affiliateId.programId.timestamp`) **preferred**
  - or `ak_ref`: the affiliate `refCode` (fallback)
  - or `ak_vid`: the visitor id used by `tracker.js` (attributes to the most recent tracked click)

Webhook currently listens to `payment.captured` and creates a `Conversion` with `status=PENDING`.

## Refund handling (MVP)

Refunds are handled manually:
- In `/dashboard/conversions`, you can mark an **APPROVED** conversion as **Refunded**.
- Refund sets `status=REJECTED` and stores `refundedAt` + `refundReason`.
- If a conversion is already paid out, the UI blocks refund (handle outside the system).
