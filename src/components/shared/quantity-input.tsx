import { Input } from '../ui/input'

export const QuantityInput = ({ value, onChange, min = 0, max }: { value: number; onChange: (value: number) => void; min?: number; max?: number }) => (
  <Input type="number" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
)
