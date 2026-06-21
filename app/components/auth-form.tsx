'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from '@/components/ui/spinner'

export function AuthForm({
  searchParams,
}: {
  searchParams: { message: string; type: string; email: string }
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState(searchParams?.email || '')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials')
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error: any) {
      console.error('Google sign-in error:', error)
      setError(error?.message || 'Failed to sign in with Google')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          isSignUp,
          ...(isSignUp && { name }),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send verification code')
        setIsLoading(false)
        return
      }

      // Move to code verification step
      setStep('2fa')
      setCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsLoading(false)
    }
  }

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()

      if (isSignUp) {
        // For signup: verify OTP to confirm email
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token: code,
          type: 'email',
        })

        if (verifyError) {
          let errorMessage = 'Invalid verification code'
          if (verifyError.message.includes('Token has expired')) {
            errorMessage = 'The verification code has expired. Please request a new one.'
          } else if (verifyError.message.includes('Token has been used')) {
            errorMessage = 'This verification code has already been used. Please request a new one.'
          }
          setError(errorMessage)
          setIsLoading(false)
          return
        }

        // Account created successfully, user already provided name during signup
        router.push('/')
      } else {
        // For login: verify OTP to create session
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

        // Session created successfully
        router.push('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full surface-panel p-4 md:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-border/80 surface-panel md:grid-cols-[1.1fr_1fr] md:min-h-[calc(100vh-4rem)]">
        <div className="hidden border-r border-border/80 surface-interactive p-8 md:flex md:flex-col md:justify-between lg:p-10">
          <div>
            <p className="text-xs text-muted-foreground">cautie</p>
            <h1 className="mt-4 text-3xl leading-tight lg:text-4xl">Learn faster with clean workflows.</h1>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              One account for your classes, tools, agenda, and personalized setup.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Secure sign-in and account creation</p>
        </div>

        <div className="flex items-center justify-center p-4 md:p-8 lg:p-10">
          <div className="w-full max-w-md space-y-5 rounded-2xl border border-border/70 surface-panel p-4 md:p-5">
            <div className="text-center md:text-left">
              <h2 className="text-2xl md:text-3xl">Welcome to cautie</h2>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                {step === 'credentials'
                  ? `Enter your email and password to ${isSignUp ? 'create an account' : 'sign in'}`
                  : 'Enter the verification code sent to your email'}
              </p>
            </div>

            {(searchParams?.message || error) && (
              <div className={`rounded-lg p-3 text-sm ${searchParams?.type === 'error' || error ? 'bg-destructive/10 text-destructive' : 'bg-blue-500/10 text-blue-600'}`}>
                {error || searchParams?.message}
              </div>
            )}

            <div className="space-y-4 border-t border-border/70 pt-4">
              {step === 'credentials' ? (
                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        required
                        disabled={isLoading}
                        className="h-10"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="m@example.com"
                      required
                      disabled={isLoading}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="h-10"
                    />
                  </div>
                  <Button type="submit" disabled={isLoading || !email.trim() || !password.trim() || (isSignUp && !name.trim())} className="h-10 w-full">
                    {isLoading ? (
                      <>
                        <Spinner size={16} color="white" className="mr-2" />
                        {isSignUp ? 'Creating account...' : 'Signing in...'}
                      </>
                    ) : (
                      isSignUp ? 'Create Account' : 'Sign In'
                    )}
                  </Button>

                  <div className="relative flex items-center gap-2">
                    <div className="flex-1 border-t border-border/50" />
                    <span className="text-xs text-muted-foreground">Or continue with</span>
                    <div className="flex-1 border-t border-border/50" />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    onClick={handleGoogleSignIn}
                    className="h-10 w-full"
                  >
                    {isLoading ? (
                      <Spinner size={16} className="mr-2" />
                    ) : (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    Sign in with Google
                  </Button>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => {
                        setIsSignUp(!isSignUp)
                        setError(null)
                        setCode('')
                        setName('')
                        setPassword('')
                      }}
                      disabled={isLoading}
                      className="h-8 px-1"
                    >
                      {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handle2FASubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Verification Code</Label>
                    <Input
                      id="code"
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 8-digit code"
                      required
                      disabled={isLoading}
                      className="h-12 text-center text-2xl tracking-widest"
                    />
                    <p className="text-center text-sm text-muted-foreground">
                      Enter the verification code sent to {email}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Button type="submit" disabled={isLoading || code.length !== 8} className="h-10 w-full">
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
                        setStep('credentials')
                        setError(null)
                        setCode('')
                      }}
                      disabled={isLoading}
                      className="h-10 w-full"
                    >
                      Back
                    </Button>
                  </div>
                </form>
              )}
              </div>
          </div>
        </div>
      </div>
    </div>
  )
}
