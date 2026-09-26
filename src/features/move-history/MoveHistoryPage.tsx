import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '../../components/shared/data-table'
import { FilterDropdown, SearchBar } from '../../components/shared/filters'
import { PageHeader } from '../../components/shared/page-header'
import { StatusBadge } from '../../components/shared/status-badge'
import { ledgerService } from '../../services/ledgerService'

export const MoveHistoryPage = () => {
  const [search, setSearch] = useState('')
  const [operation, setOperation] = useState('all')
  const query = useQuery({ queryKey: ['ledger'], queryFn: () => ledgerService.getEntries() })

  const filtered = useMemo(
    () =>
      (query.data ?? []).filter((entry) => {
        const bySearch = `${entry.reference} ${entry.sku} ${entry.user}`.toLowerCase().includes(search.toLowerCase())
        const byOperation = operation === 'all' || entry.operation === operation
        return bySearch && byOperation
      }),
    [query.data, search, operation],
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Move History" description="Immutable-feeling stock ledger for every movement" />
      <div className="grid gap-2 md:grid-cols-2"><SearchBar value={search} onChange={setSearch} /><FilterDropdown value={operation} onChange={setOperation} options={[{ label: 'All Operations', value: 'all' }, { label: 'Receipt', value: 'Receipt' }, { label: 'Delivery', value: 'Delivery' }, { label: 'Internal Transfer', value: 'Internal Transfer' }, { label: 'Adjustment', value: 'Adjustment' }]} /></div>
      <DataTable
        data={filtered}
        columns={[
          { key: 'time', header: 'Date/Time', render: (row) => new Date(row.timestamp).toLocaleString() },
          { key: 'ref', header: 'Reference', render: (row) => row.reference },
          { key: 'op', header: 'Operation', render: (row) => row.operation },
          { key: 'sku', header: 'SKU', render: (row) => row.sku },
          { key: 'source', header: 'Source', render: (row) => row.source },
          { key: 'destination', header: 'Destination', render: (row) => row.destination },
          { key: 'qty', header: 'Quantity', render: (row) => row.quantity },
          { key: 'user', header: 'User', render: (row) => row.user },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        ]}
      />
    </div>
  )
}
