import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Input } from '../../components/ui/input'

const AuthShell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
    <Card className="w-full max-w-md">
      <CardHeader><h1 className="text-xl font-semibold text-slate-100">{title}</h1></CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  </div>
)

export const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <AuthShell title="Login to StockSense">
      <Input placeholder="Login ID or Email" aria-label="Login ID/email" />
      <div className="relative">
        <Input type={showPassword ? 'text' : 'password'} placeholder="Password" aria-label="Password" />
        <button className="absolute right-2 top-2 text-slate-400" onClick={() => setShowPassword((value) => !value)} aria-label="Toggle password visibility">
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-400"><input type="checkbox" /> Remember me</label>
      <Button className="w-full" onClick={async () => { await login(); navigate('/dashboard') }}>Sign in</Button>
      <div className="flex justify-between text-sm"><Link to="/forgot-password" className="text-sky-300">Forgot Password</Link><Link to="/signup" className="text-sky-300">Create Account</Link></div>
    </AuthShell>
  )
}

export const SignupPage = () => {
  const { signup } = useAuth()
  const navigate = useNavigate()
  return (
    <AuthShell title="Create Account">
      <Input placeholder="Name" />
      <Input placeholder="Email" />
      <Input type="password" placeholder="Password" />
      <Input type="password" placeholder="Confirm Password" />
      <Button className="w-full" onClick={async () => { await signup(); navigate('/dashboard') }}>Create Account</Button>
      <p className="text-sm text-slate-400">Already have an account? <Link className="text-sky-300" to="/login">Sign in</Link></p>
    </AuthShell>
  )
}

export const ForgotPasswordPage = () => {
  const navigate = useNavigate()
  return (
    <AuthShell title="Forgot Password">
      <Input placeholder="Email / Login ID" />
      <Input placeholder="OTP" />
      <Input type="password" placeholder="New Password" />
      <Input type="password" placeholder="Confirm Password" />
      <Button className="w-full" onClick={() => navigate('/reset-password')}>Verify OTP & Continue</Button>
    </AuthShell>
  )
}

export const ResetPasswordPage = () => {
  const navigate = useNavigate()
  return (
    <AuthShell title="Reset Password">
      <Input type="password" placeholder="New Password" />
      <Input type="password" placeholder="Confirm Password" />
      <Button className="w-full" onClick={() => navigate('/login')}>Reset Password</Button>
    </AuthShell>
  )
}
