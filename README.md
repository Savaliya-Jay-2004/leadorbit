# LeadOrbit — AI Business Development & Client Acquisition Platform
**Built for NextOrbit Infotech**

## Tech Stack
- **Language:** TypeScript (Full-Stack)
- **Framework:** Next.js 15 (App Router) + Tailwind CSS
- **Database:** MongoDB + Mongoose (with 7-day TTL Audit Cache & Domain Deduplication)
- **Security:** `jose` JWT HTTP-only cookies + AES-256-GCM Encrypted Admin API Vault

## Getting Started
1. Configure your MongoDB connection string in `.env.local`:
   ```env
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/leadorbit
   ```
2. Install dependencies & run development server:
   ```bash
   npm install
   npm run dev
   ```
3. Open `http://localhost:3000/login`

## Default Seeded Accounts (Created Automatically on First DB Connect)
- **Super Admin:** `admin@nextorbit.in` / `Admin@123`
- **Sales Manager:** `manager@nextorbit.in` / `Bde@123`
- **BDE Executive:** `bde@nextorbit.in` / `Bde@123`

## Admin API Setup
Log in as **Super Admin** and open **API Vault (`/admin/integrations`)** to securely add, toggle, quota-limit, and live-test keys for:
- Google Places API
- Serper.dev (Google Search & Jobs)
- Google PageSpeed Insights API
- Hunter.io / Apollo.io
- Anthropic Claude / OpenAI / Google Gemini

