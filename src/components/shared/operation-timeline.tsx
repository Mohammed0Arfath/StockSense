export const OperationTimeline = ({ steps }: { steps: { label: string; active: boolean }[] }) => (
  <ol className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
    {steps.map((step, idx) => (
      <li key={step.label} className={step.active ? 'text-sky-300' : ''}>
        {idx + 1}. {step.label}
      </li>
    ))}
  </ol>
)
