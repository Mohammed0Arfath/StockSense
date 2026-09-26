# StockSense
Modern Inventory Management System built for the Odoo Hackathon. A centralized platform for managing products, stock, warehouses, receipts, deliveries, transfers, adjustments, and inventory movement history with a clean, scalable frontend architecture.
# StockSense

Modern inventory management system built for the Odoo Hackathon. StockSense centralizes products, stock,
warehouses, receipts, deliveries, transfers, adjustments, and inventory movement history in a responsive
React application.

## Architecture

StockSense is a client-side React and TypeScript application built with Vite. The code is organized by
feature at the UI boundary and by responsibility at the domain boundary.

```text
React Router
		|
		v
AppLayout + feature pages
		|
		v
Feature services (receipts, deliveries, transfers, adjustments, stock)
		|
		+--> Inventory Engine -- validates and applies stock transactions
		|         |
		|         +--> domain state and movement ledger
		|
		+--> Inventory Repository -- current in-memory persistence boundary
							|
							+--> Store and mock inventory data
```

### Application and UI layers

- `src/App.tsx` defines public authentication routes and protected application routes.
- `src/layouts/` provides the authenticated shell, sidebar navigation, and top bar.
- `src/features/` contains page-level workflows for products, stock, receipts, deliveries, transfers,
	adjustments, warehouses, locations, reordering rules, settings, and profile management.
- `src/components/shared/` and `src/components/ui/` contain reusable domain-aware and presentational
	components.

### Domain and service layers

- `src/types/domain.ts` defines the inventory domain model and operation types.
- `src/data/mockData.ts` provides the initial application state used by the current demo deployment.
- `src/services/store.ts` owns the observable in-memory state and update mechanism.
- `src/services/inventoryRepository.ts` isolates services from persistence. It currently adapts the store,
	so a remote API or database adapter can be introduced without changing feature services.
- `src/services/inventoryEngine.ts` is the transaction boundary for receiving, delivering, transferring,
	and adjusting stock. It validates the full operation before mutating state, preventing partial updates,
	and writes movement ledger entries for successful lines.
- Feature services such as `receiptService.ts`, `deliveryService.ts`, `transferService.ts`, and
	`adjustmentService.ts` coordinate user-facing operations and delegate stock mutations to the engine.
- `src/services/ledgerService.ts` exposes movement history, while `src/utils/inventory.ts` contains stock
	aggregation and status calculations.

### State synchronization

The repository publishes changes through a subscription. `useInventorySync` listens for those changes and
invalidates TanStack Query caches, allowing dashboard, stock, and workflow screens to refresh after an
operation without coupling UI components directly to the store.

### Transaction guarantees

Inventory operations follow a validate-then-apply model:

1. Resolve the referenced document, warehouse, locations, products, and stock records.
2. Validate quantities, statuses, warehouse boundaries, and available stock.
3. Apply all stock mutations and document status changes only after validation succeeds.
4. Append one movement-history entry per successful inventory line.

Invalid operations raise `InventoryOperationError` and leave stock, document status, and ledger history
unchanged.

## Development

Install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Run the test suite:

```bash
npm test
```

Create a production build:

```bash
npm run build
```

Run the linter:

```bash
npm run lint
```
