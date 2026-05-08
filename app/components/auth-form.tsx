'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export function AuthForm({
  signIn,
  signUp,
  searchParams,
}: {
  signIn: (formData: FormData) => void
  signUp: (formData: FormData) => void
  searchParams: { message: string; type: string; email: string }
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState(searchParams?.email || '')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials')

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('email', email)
      formData.append('password', password)
      await (isSignUp ? signUp : signIn)(formData)
      // If 2FA is required, the server will redirect with appropriate message
    } catch (error) {
      console.error('Authentication failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('email', email)
      formData.append('password', password)
      formData.append('code', code)
      await signIn(formData)
    } catch (error) {
      console.error('2FA verification failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full surface-panel p-4 md:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-border/80 surface-panel md:grid-cols-[1.1fr_1fr] md:min-h-[calc(100vh-4rem)]">
        <div className="hidden border-r border-border/80 surface-interactive p-8 md:flex md:flex-col md:justify-between lg:p-10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">cautie</p>
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

            <div className="space-y-4 border-t border-border/70 pt-4">
              {step === 'credentials' ? (
                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
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
                  <Button type="submit" disabled={isLoading || !email.trim() || !password.trim()} className="h-10 w-full">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isSignUp ? 'Creating account...' : 'Signing in...'}
                      </>
                    ) : (
                      isSignUp ? 'Create Account' : 'Sign In'
                    )}
                  </Button>
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setIsSignUp(!isSignUp)}
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
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Verify Code'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep('credentials')}
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
