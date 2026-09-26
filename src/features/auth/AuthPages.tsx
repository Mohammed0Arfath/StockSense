import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { authService } from '../../services/authService'

const AuthShell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4"><Card className="w-full max-w-md"><CardHeader><h1 className="text-xl font-semibold text-slate-100">{title}</h1></CardHeader><CardContent className="space-y-3">{children}</CardContent></Card></div>
)

const FormError = ({ message }: { message: string }) => message ? <p role="alert" className="text-sm text-red-300">{message}</p> : null

export const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  const submit = async () => {
    setPending(true); setError('')
    try { await login(email, password); navigate('/dashboard') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Sign-in failed.') } finally { setPending(false) }
  }
  return <AuthShell title="Login to StockSense">
    <Input type="email" autoComplete="email" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
    <div className="relative"><Input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Password" aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" className="absolute right-2 top-2 text-slate-400" onClick={() => setShowPassword((value) => !value)} aria-label="Toggle password visibility">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
    <FormError message={error} /><Button className="w-full" disabled={pending || !email || !password} onClick={() => void submit()}>{pending ? 'Signing in…' : 'Sign in'}</Button>
    <div className="flex justify-between text-sm"><Link to="/forgot-password" className="text-sky-300">Forgot Password</Link><Link to="/signup" className="text-sky-300">Create Account</Link></div>
  </AuthShell>
}

export const SignupPage = () => {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const [pending, setPending] = useState(false)
  const submit = async () => {
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setPending(true); setError('')
    try { const signedIn = await signup(name, email, password); if (signedIn) navigate('/dashboard'); else setError('Check your email to confirm your account, then sign in.') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Account creation failed.') } finally { setPending(false) }
  }
  return <AuthShell title="Create Account"><Input autoComplete="name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} /><Input type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} /><Input type="password" autoComplete="new-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} /><Input type="password" autoComplete="new-password" placeholder="Confirm Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /><FormError message={error} /><Button className="w-full" disabled={pending || !name || !email || password.length < 8} onClick={() => void submit()}>{pending ? 'Creating account…' : 'Create Account'}</Button><p className="text-sm text-slate-400">Already have an account? <Link className="text-sky-300" to="/login">Sign in</Link></p></AuthShell>
}

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState(''); const [error, setError] = useState(''); const [pending, setPending] = useState(false); const navigate = useNavigate()
  const submit = async () => { setPending(true); setError(''); try { await authService.requestPasswordReset(email); navigate('/reset-password', { state: { email } }) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send a reset code.') } finally { setPending(false) } }
  return <AuthShell title="Forgot Password"><Input type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} /><FormError message={error} /><Button className="w-full" disabled={pending || !email} onClick={() => void submit()}>{pending ? 'Sending…' : 'Send verification code'}</Button><Link className="text-sm text-sky-300" to="/login">Back to sign in</Link></AuthShell>
}

export const ResetPasswordPage = () => {
  const location = useLocation(); const [searchParams] = useSearchParams(); const email = (location.state as { email?: string } | null)?.email ?? searchParams.get('email') ?? ''; const navigate = useNavigate()
  const [token, setToken] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const [pending, setPending] = useState(false)
  const submit = async () => { if (password !== confirm) { setError('Passwords do not match.'); return }; setPending(true); setError(''); try { await authService.verifyPasswordReset(email, token, password); navigate('/login') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Password reset failed.') } finally { setPending(false) } }
  return <AuthShell title="Reset Password"><p className="text-sm text-slate-400">Enter the verification code sent to {email || 'your email'}.</p><Input aria-label="Verification code" inputMode="numeric" placeholder="OTP" value={token} onChange={(e) => setToken(e.target.value)} /><Input type="password" autoComplete="new-password" placeholder="New Password" value={password} onChange={(e) => setPassword(e.target.value)} /><Input type="password" autoComplete="new-password" placeholder="Confirm Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /><FormError message={error} /><Button className="w-full" disabled={pending || !email || !token || password.length < 8} onClick={() => void submit()}>{pending ? 'Updating…' : 'Reset Password'}</Button></AuthShell>
}
