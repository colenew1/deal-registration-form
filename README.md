# AmplifAI Deal Registration Portal

MVP deal registration system with Supabase backend and Zapier webhook integration.

## Quick Start

### 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **SQL Editor** and run the contents of `supabase-schema.sql`
3. Go to **Settings > API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Configure Environment

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ADMIN_PASSWORD=your-admin-password
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/xxxxx/xxxxx/
```

### 3. Run Locally

```bash
npm install
npm run dev
```

- **Form:** http://localhost:3000
- **Admin:** http://localhost:3000/admin

### 4. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add the environment variables in Vercel dashboard.

## Features

### Public Form (`/`)
- Partner deal registration form
- Customer info, opportunity details, TA info, TSD info
- Submits to Supabase and redirects to thank you page

### Admin Dashboard (`/admin`)
- View all registrations (filter by pending/approved/rejected)
- Click to view full details
- Approve with AE assignment → fires Zapier webhook
- Reject with reason selection

### Zapier Webhook

On approval, the following payload is sent to your Zapier webhook:

```json
{
  "event": "deal_registration_approved",
  "registration_id": "...",
  "approved_at": "2024-01-13T...",
  "assigned_ae": {
    "name": "Oliver Gohring",
    "email": "ogohring@amplifai.com"
  },
  "customer": {
    "firstName": "Rachel",
    "lastName": "Skillings",
    "companyName": "SMSC Gaming Enterprise",
    "email": "rachel@example.com",
    ...
  },
  "opportunity": {
    "agentCount": "100-249",
    "solutions": ["Performance Management", "Coaching"],
    ...
  },
  "partner": {
    "taFullName": "Mallory Santucci",
    "taCompanyName": "SHI",
    "tsdName": "Avant",
    ...
  }
}
```

## Database Schema

See `supabase-schema.sql` for the complete schema. Main tables:

- `deal_registrations` - All registration submissions
- `account_executives` - AE dropdown options (Oliver, Curt)
- `known_tsds` - TSD list for future fuzzy matching

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL)
- Vercel (deployment)
