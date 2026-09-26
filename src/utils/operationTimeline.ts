import type { OperationStatus, OperationStatusEvent } from '../types/domain'

export interface TimelineStep {
  label: string
  active: boolean
  timestamp?: string
}

export const operationTimelineSteps = (status: OperationStatus, history: OperationStatusEvent[] = []): TimelineStep[] => {
  const timestampFor = (value: OperationStatus) => history.find((event) => event.status === value)?.timestamp
  if (status === 'canceled') {
    return [
      { label: 'Created', active: true, timestamp: timestampFor('draft') },
      { label: 'Canceled', active: true, timestamp: timestampFor('canceled') },
    ]
  }
  if (status === 'applied') {
    return [
      { label: 'Created', active: true, timestamp: timestampFor('draft') },
      { label: 'Applied', active: true, timestamp: timestampFor('applied') },
    ]
  }
  const activeIndex = status === 'draft' ? 0 : status === 'waiting' ? 1 : status === 'ready' ? 2 : 3
  return [
    { label: 'Created', active: true, timestamp: timestampFor('draft') },
    { label: 'Waiting', active: activeIndex >= 1, timestamp: timestampFor('waiting') },
    { label: 'Ready', active: activeIndex >= 2, timestamp: timestampFor('ready') },
    { label: 'Done', active: activeIndex >= 3, timestamp: timestampFor('done') },
  ]
}
