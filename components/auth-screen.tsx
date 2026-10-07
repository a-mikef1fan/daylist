'use client'

import { useState } from 'react'
import { Check, CircleCheck, ListTodo, LockKeyhole, MoveRight } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

export function AuthScreen() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-up')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setPending(true)
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') || '').trim()
    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('password') || '')

    try {
      const result =
        mode === 'sign-up'
          ? await authClient.signUp.email({ name, email, password })
          : await authClient.signIn.email({ email, password })
      if (result.error) {
        setError('We couldn’t sign you in with those details. Please check them and try again.')
        return
      }
      window.location.assign('/')
    } catch {
      setError('Something went wrong. Please try again in a moment.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-intro" aria-label="daylist introduction">
        <a href="/" className="brand-mark" aria-label="Taskwell home">
          <span className="brand-icon"><Check aria-hidden="true" /></span>
          <span>daylist</span>
        </a>
        <div className="intro-copy">
          <span className="eyebrow">A little more intentional</span>
          <h1>Make room for<br />what matters.</h1>
          <p>A calm place to gather your thoughts, find your focus, and finish the day feeling good about what you did.</p>
          <div className="intro-benefits">
            <span><CircleCheck aria-hidden="true" /> Your tasks, always in sync</span>
            <span><LockKeyhole aria-hidden="true" /> Private to your account</span>
          </div>
        </div>
        <div className="intro-note"><ListTodo aria-hidden="true" /><span>One thing at a time is still progress.</span></div>
      </section>

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="mobile-brand"><span className="brand-icon"><Check aria-hidden="true" /></span> daylist</div>
        <div className="auth-form-wrap">
          <span className="eyebrow">YOUR DAY, AT YOUR PACE</span>
          <h2 id="auth-title">{mode === 'sign-up' ? 'Start with a fresh page.' : 'Welcome back.'}</h2>
          <p className="auth-subtitle">{mode === 'sign-up' ? 'Create an account to keep your tasks close.' : 'Sign in to pick up where you left off.'}</p>
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'sign-up' && (
              <label className="form-field">
                <span>Your name</span>
                <input name="name" autoComplete="name" placeholder="Jordan Lee" required maxLength={80} />
              </label>
            )}
            <label className="form-field">
              <span>Email address</span>
              <input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
            </label>
            <label className="form-field">
              <span>Password</span>
              <input name="password" type="password" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} placeholder="At least 8 characters" minLength={8} required />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={pending}>
              {pending ? 'One moment…' : mode === 'sign-up' ? 'Create my account' : 'Sign in'}
              {!pending && <MoveRight aria-hidden="true" />}
            </button>
          </form>
          <p className="auth-switch">
            {mode === 'sign-up' ? 'Already have an account?' : 'New to daylist?'}{' '}
            <button type="button" onClick={() => { setError(''); setMode(mode === 'sign-up' ? 'sign-in' : 'sign-up') }}>
              {mode === 'sign-up' ? 'Sign in' : 'Create an account'}
            </button>
          </p>
          <p className="privacy-note"><LockKeyhole aria-hidden="true" /> Your tasks are private and only visible to you.</p>
        </div>
        <span className="auth-footer">Small steps. Clear mind.</span>
      </section>
    </main>
  )
}
