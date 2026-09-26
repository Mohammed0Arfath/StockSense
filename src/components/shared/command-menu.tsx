import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchBar } from './filters'
import { useInventoryState } from '../../hooks/useInventoryState'

export const CommandMenu = () => {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const state = useInventoryState()
  const results = useMemo(() => {
    const query = value.trim().toLowerCase()
    if (!query) return []
    return [
      ...state.products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(query)).map((product) => ({ label: product.name, detail: product.sku, href: `/products/${product.id}` })),
      ...state.receipts.filter((receipt) => receipt.receiptNumber.toLowerCase().includes(query)).map((receipt) => ({ label: receipt.receiptNumber, detail: 'Receipt', href: `/receipts/${receipt.id}` })),
      ...state.deliveries.filter((delivery) => delivery.deliveryNumber.toLowerCase().includes(query)).map((delivery) => ({ label: delivery.deliveryNumber, detail: 'Delivery', href: `/deliveries/${delivery.id}` })),
      ...state.transfers.filter((transfer) => transfer.transferNumber.toLowerCase().includes(query)).map((transfer) => ({ label: transfer.transferNumber, detail: 'Transfer', href: `/transfers/${transfer.id}` })),
    ].slice(0, 6)
  }, [state.products, state.receipts, state.deliveries, state.transfers, value])

  return (
    <div className="relative">
      <SearchBar value={value} onChange={(next) => { setValue(next); setOpen(true) }} placeholder="Search products or operations..." />
      {open && value.trim() ? (
        <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-slate-700 bg-slate-900 shadow-xl">
          {results.length ? results.map((result) => (
            <button key={result.href} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-800" onClick={() => { navigate(result.href); setValue(''); setOpen(false) }}>
              <span className="truncate text-slate-100">{result.label}</span><span className="shrink-0 text-xs text-slate-400">{result.detail}</span>
            </button>
          )) : <p className="px-3 py-2 text-sm text-slate-400">No matching products or operations.</p>}
          <button className="w-full border-t border-slate-800 px-3 py-1.5 text-left text-xs text-slate-400 hover:text-slate-200" onClick={() => setOpen(false)}>Close</button>
        </div>
      ) : null}
    </div>
  )
}
