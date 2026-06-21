'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from '@/components/ui/spinner'

type Step = 'email' | 'code' | 'password'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send verification code')
        setIsLoading(false)
        return
      }

      setStep('code')
      setCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      })

      if (verifyError) {
        let errorMessage = 'Invalid verification code'
        if (verifyError.message.includes('Token has expired')) {
          errorMessage = 'The verification code has expired. Please request a new one.'
        }
        setError(errorMessage)
        setIsLoading(false)
        return
      }

      setStep('password')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) throw updateError

      router.push('/login?message=Password reset successfully. Please sign in with your new password.&type=success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border/70 surface-panel p-6">
        <div className="text-center">
          <h1 className="text-2xl">
            {step === 'email' ? 'Reset password' : step === 'code' ? 'Check your email' : 'Create new password'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === 'email'
              ? "Enter your email and we'll send you a verification code"
              : step === 'code'
                ? 'Enter the verification code sent to your email'
                : 'Enter your new password below'}
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isLoading}
                className="h-10"
                autoFocus
              />
            </div>

            <Button type="submit" disabled={isLoading || !email.trim()} className="h-10 w-full">
              {isLoading ? (
                <>
                  <Spinner size={16} color="white" className="mr-2" />
                  Sending...
                </>
              ) : (
                'Send verification code'
              )}
            </Button>

            <Button
              type="button"
              variant="link"
              onClick={() => router.push('/login')}
              className="w-full"
            >
              Back to login
            </Button>
          </form>
        ) : step === 'code' ? (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit code"
                required
                disabled={isLoading}
                className="h-12 text-center text-2xl tracking-widest"
                autoFocus
              />
              <p className="text-center text-sm text-muted-foreground">
                Code sent to {email}
              </p>
            </div>

            <Button type="submit" disabled={isLoading || code.length !== 6} className="h-10 w-full">
              {isLoading ? (
                <>
                  <Spinner size={16} color="white" className="mr-2" />
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep('email')
                setError(null)
                setCode('')
              }}
              disabled={isLoading}
              className="w-full"
            >
              Back
            </Button>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                disabled={isLoading}
                className="h-10"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                disabled={isLoading}
                className="h-10"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="h-10 w-full"
            >
              {isLoading ? (
                <>
                  <Spinner size={16} color="white" className="mr-2" />
                  Resetting...
                </>
              ) : (
                'Reset password'
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep('code')
                setPassword('')
                setConfirmPassword('')
                setError(null)
              }}
              disabled={isLoading}
              className="w-full"
            >
              Back
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
