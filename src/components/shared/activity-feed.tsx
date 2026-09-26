export const ActivityFeed = ({ items }: { items: { title: string; meta: string }[] }) => (
  <ul className="space-y-3">
    {items.map((item, idx) => (
      <li key={idx} className="rounded-md border border-slate-800 bg-slate-900 p-3">
        <p className="text-sm text-slate-100">{item.title}</p>
        <p className="text-xs text-slate-400">{item.meta}</p>
      </li>
    ))}
  </ul>
)
