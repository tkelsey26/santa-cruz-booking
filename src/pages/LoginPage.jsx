import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
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

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'login') {
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
      else navigate('/')
    } else {
      const { error } = await signUp(email, password, fullName)
      if (error) {
        setError(error.message)
      } else {
        setMessage('Account created! Check your email to confirm, then sign in.')
        setMode('login')
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
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Sign in to view and manage bookings.'
                : 'Join the house booking system.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {message && (
              <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-700">
                {message}
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

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
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

              {error && <p className="text-sm text-rose-600">{error}</p>}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-5">
              {mode === 'login' ? (
                <>New here?{' '}
                  <button
                    onClick={() => { setMode('signup'); setError(null) }}
                    className="text-sea-600 hover:underline font-medium"
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>Have an account?{' '}
                  <button
                    onClick={() => { setMode('login'); setError(null) }}
                    className="text-sea-600 hover:underline font-medium"
                  >
                    Sign in
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
