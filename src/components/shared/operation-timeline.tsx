import type { TimelineStep } from '../../utils/operationTimeline'

export const OperationTimeline = ({ steps }: { steps: TimelineStep[] }) => (
  <ol className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
    {steps.map((step, idx) => (
      <li key={step.label} className={step.active ? 'text-sky-300' : ''}>
        <span>{idx > 0 ? '→ ' : ''}{step.label}</span>
        {step.timestamp ? <time className="ml-1 block text-[10px] text-slate-500" dateTime={step.timestamp}>{new Date(step.timestamp).toLocaleString()}</time> : null}
      </li>
    ))}
  </ol>
)
