import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase automatically exchanges the token in the URL hash for a session.
    // We listen for PASSWORD_RECOVERY to know the session is active.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      await supabase.auth.signOut()
      navigate('/login', { state: { message: 'Password updated. Please sign in with your new password.' } })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sea-100 to-sea-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Santa Cruz House</h1>
          <p className="text-slate-500 text-sm mt-1">Family booking system</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Set a new password</CardTitle>
            <CardDescription>Choose a new password for your account.</CardDescription>
          </CardHeader>

          <CardContent>
            {!ready ? (
              <p className="text-sm text-slate-500 text-center py-4">Verifying reset link…</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
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

                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                  />
                </div>

                {error && <p className="text-sm text-rose-600">{error}</p>}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Updating…' : 'Update password'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
