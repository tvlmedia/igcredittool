# IronGlass Credit Tracker

Premium credit dashboard for IronGlass ambassadors. Built with Next.js 15,
TypeScript, TailwindCSS, Supabase Auth/Database and Recharts.

## Features

- Supabase login, signup, password reset and protected dashboard routes
- Row Level Security for ambassador-owned data, with admin read access
- Sales, expos, rental tours, expenses and purchases
- EUR/USD original-currency storage with exchange-rate snapshots for conversions
- Dashboard totals: total credit, earned, spent, balance, EUR reserve, USD reserve
- Recharts growth, breakdown and source profitability charts
- Timeline with date, type, currency, tag and linked-source filters
- CSV export and PDF report export
- Reminders for deadlines, expiring credits and follow-ups
- Google Calendar links for expos and rental tours
- Insights for best expo, best rental tour, average ROI and annual growth

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_DEFAULT_EUR_USD_RATE=1.08
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

No secrets are hardcoded. Use the anon key on the client and keep service-role
keys out of this app.

## Supabase database

Run the migration in `supabase/migrations/001_initial_schema.sql` in your
Supabase SQL editor or through the Supabase CLI.

The migration creates:

- `profiles`
- `transactions`
- `sale_details`
- `expo_details`
- `rental_tour_details`
- `expense_items`
- `purchase_details`
- `tags`
- `transaction_tags`
- `reminders`

It also enables RLS and creates policies so ambassadors only read/write their own
rows. Admin profiles can read all rows.

To make a user admin:

```sql
update public.profiles
set role = 'admin'
where email = 'name@example.com';
```

## Currency model

EUR entries remain stored as EUR and USD entries remain stored as USD.
Dashboard totals use `NEXT_PUBLIC_DEFAULT_EUR_USD_RATE` as the current rate for
EUR valuation. Purchases that convert EUR credit to USD store
`exchange_rate_snapshot` in `purchase_details` and `transactions`.

## Deployment

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add the same environment variables in Vercel.
4. Run the Supabase migration before using the deployed app.

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
```
