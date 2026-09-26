import { Select } from '../ui/select'

interface Option {
  id: string
  name: string
}

export const ProductSelector = ({ value, onChange, items }: { value: string; onChange: (value: string) => void; items: Option[] }) => (
  <Select value={value} onChange={(e) => onChange(e.target.value)}>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
)

export const WarehouseSelector = ({ value, onChange, items }: { value: string; onChange: (value: string) => void; items: Option[] }) => (
  <Select value={value} onChange={(e) => onChange(e.target.value)}>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
)

export const LocationSelector = ({ value, onChange, items }: { value: string; onChange: (value: string) => void; items: Option[] }) => (
  <Select value={value} onChange={(e) => onChange(e.target.value)}>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
)
