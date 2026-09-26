import { Card, CardContent } from '../ui/card'
import { Skeleton } from '../ui/skeleton'

export const EmptyState = ({ title, message }: { title: string; message: string }) => (
  <Card><CardContent><h3 className="font-medium text-slate-200">{title}</h3><p className="mt-1 text-sm text-slate-400">{message}</p></CardContent></Card>
)

export const LoadingState = () => (
  <Card><CardContent className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></CardContent></Card>
)

export const ErrorState = ({ message }: { message: string }) => (
  <Card><CardContent><p className="text-sm text-red-300">{message}</p></CardContent></Card>
)
