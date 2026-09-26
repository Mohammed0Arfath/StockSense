import { Card, CardContent } from '../ui/card'

export const MetricCard = ({ title, value, hint }: { title: string; value: string | number; hint?: string }) => (
  <Card>
    <CardContent>
      <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-100">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </CardContent>
  </Card>
)
