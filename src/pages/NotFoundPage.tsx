import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'

export const NotFoundPage = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 text-slate-100">
    <h1 className="text-3xl font-semibold">404</h1>
    <p className="text-slate-400">The page you requested does not exist.</p>
    <Link to="/dashboard"><Button>Go to Dashboard</Button></Link>
  </div>
)
