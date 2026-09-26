import { Search } from 'lucide-react'
import { Input } from '../ui/input'
import { Select } from '../ui/select'

export const SearchBar = ({ value, onChange, placeholder = 'Search...' }: { value: string; onChange: (value: string) => void; placeholder?: string }) => (
  <div className="relative">
    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-8" />
  </div>
)

export const FilterDropdown = ({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: { label: string; value: string }[] }) => (
  <Select value={value} onChange={(e) => onChange(e.target.value)}>
    {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </Select>
)
