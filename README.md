# StockSense

StockSense is a React, TypeScript, and Vite inventory management application. Inventory changes follow one application mutation path:

```text
React UI
  ↓
Hooks
  ↓
Services
  ↓
Inventory Engine
  ↓
Inventory Repository
  ↓
Supabase RPC / PostgreSQL
  ↓
Stock / Operations / Ledger
```

The UI presents forms and results; hooks expose service calls and refresh queries; services provide the application-facing API. The inventory engine performs domain preflight and orchestrates mutations, while the repository owns persistence details and translates database errors. PostgreSQL RPCs remain the final validation and atomic transaction boundary. Tests use the in-memory repository state adapter.

## Stack

- React 19, TypeScript, Vite, React Router, TanStack Query
- npm with package-lock.json
- Supabase Auth and PostgreSQL
- No service-role key is used by browser code

## Frontend setup

1. Install a recent Node.js 22 release and npm.
2. Run npm install.
3. Copy .env.example to .env.local.
4. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from your Supabase project.
5. Run npm run dev.

The Supabase URL and publishable key are public client configuration values. Never put a database password, secret key, or other privileged secret in a VITE_ variable.

## Database setup

Install the Supabase CLI. To start a local Supabase stack and apply migrations plus deterministic demo fixtures:

    npx supabase start
    npx supabase db reset

For a hosted project:

    npx supabase link --project-ref YOUR_PROJECT_REF
    npx supabase db push

Migrations under supabase/migrations create profiles, categories, products, warehouses, locations, location-level stock, receipts and lines, deliveries and lines, transfers and lines, adjustments, reorder rules, notifications, status history, and the movement ledger. Stock-changing RPCs lock affected rows and atomically update stock, operation status, ledger, and transition history.

New accounts default to Warehouse Staff. To grant a trusted initial administrator, run this as the project owner after signup:

    update public.profiles set role = 'Inventory Manager'
    where id = (select id from auth.users where email = 'admin@example.com');

Configure the Supabase Auth password recovery email template to send an OTP token and allow http://localhost:5173/reset-password as a redirect URL. Signup may require email confirmation before the user can sign in.

## Checks

- Unit tests: npm test
- Lint: npm run lint
- Typecheck: npx tsc -b
- Production build: npm run build

The tests run against in-memory fixtures. No Supabase project credentials or local Supabase service were available in this workspace, so database integration tests and actual migration execution were not run. Use the local Supabase stack to smoke-test signup, role setup, CRUD, and inventory transactions before deployment.
