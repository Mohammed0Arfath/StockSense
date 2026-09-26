# StockSense demo path (3–5 minutes)

Use a fresh local Supabase demo database (`npx supabase db reset`) and an authenticated account with the **Inventory Manager** role. The seed contains real inventory rows and operation documents; dashboard and intelligence values are calculated from those rows. Do not use a service-role key in the browser.

1. **Login → Dashboard (30 seconds).** Point out the healthy Steel Rods, low Copper Wire, and out-of-stock Safety Gloves states. The pending receipt, delivery, transfer, and recent adjustment are persisted seed data.
2. **Critical insight → Product (30 seconds).** Open Safety Gloves from Inventory Health or Stock Risk, then show its current quantity and location.
3. **Receipt (45–60 seconds).** Create a receipt for Steel Rods at the Main Warehouse receiving location with quantity 20. Advance it through Waiting and Ready, then validate. Show the stock increase and Done state.
4. **Internal transfer (45–60 seconds).** Transfer 10 Steel Rods from Main Warehouse / Rack A1 to South Warehouse / Rack B1. Advance it through Waiting and Ready, then validate. Show the source and destination quantities; their combined quantity is unchanged.
5. **Delivery (45–60 seconds).** Create a delivery for 5 Steel Rods from Main Warehouse / Rack A1. Advance it through Waiting and Ready, then validate. Show the 5-unit decrease.
6. **Adjustment → Move History → Intelligence (45–60 seconds).** Create and apply a small count adjustment at the location shown on the form. Open Move History to show the adjustment ledger event, then return to the dashboard and explain the current reorder suggestion and why each risk is shown.

Use the dashboard's create links and each operation's existing status actions. Re-running this path changes the disposable local demo database, so run `npx supabase db reset` before a repeat presentation when a clean baseline is needed.

## Deployment prerequisites

- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the deployment environment. These are public client values. Never set a service-role or secret key in a `VITE_` variable.
- Apply all files under `supabase/migrations` to the target project and verify anonymous inventory access remains denied by the security migration.
- Configure Supabase Auth signup/email confirmation and the production redirect URLs, including the password reset route.
- Create or promote the presentation account to **Inventory Manager** through a trusted server-side/admin process.
- Apply `supabase/seed.sql` only to a demo project/database. It contains deterministic demo records; it is not production customer data.
- Build with `npm run build`, deploy the generated `dist` directory to a static host with SPA fallback routing enabled, and smoke-test login plus protected routes.
