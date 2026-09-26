import { SearchBar } from './filters'

export const CommandMenu = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <SearchBar value={value} onChange={onChange} placeholder="Search products, receipts, deliveries..." />
)
