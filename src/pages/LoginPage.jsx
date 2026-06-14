import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationMessage = location.state?.message

  function switchMode(next) {
    setMode(next)
    setError(null)
    setMessage(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
      else navigate('/')
    } else if (mode === 'signup') {
      const { error } = await signUp(email, password, fullName)
      if (error) {
        setError(error.message)
      } else {
        setMessage('Account created! Check your email to confirm, then sign in.')
        setMode('login')
      }
    } else if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email for a password reset link.')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sea-100 to-sea-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Santa Cruz House</h1>
          <p className="text-slate-500 text-sm mt-1">Family booking system</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">
              {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create an account' : 'Reset your password'}
            </CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Sign in to view and manage bookings.'
                : mode === 'signup'
                ? 'Join the house booking system.'
                : 'Enter your email and we\'ll send you a reset link.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {(message || locationMessage) && (
              <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-700">
                {message || locationMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    placeholder="Your full name"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-xs text-slate-400 hover:text-sea-600 hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                  />
                </div>
              )}

              {error && <p className="text-sm text-rose-600">{error}</p>}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-5">
              {mode === 'login' ? (
                <>New here?{' '}
                  <button onClick={() => switchMode('signup')} className="text-sea-600 hover:underline font-medium">
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => switchMode('login')} className="text-sea-600 hover:underline font-medium">
                    Back to sign in
                  </button>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
