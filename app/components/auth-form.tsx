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
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <div className="mx-auto max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome to cautie</h1>
          <p className="text-base text-muted-foreground mt-2">
            {step === 'credentials'
              ? `Enter your email and password to ${isSignUp ? 'create an account' : 'sign in'}`
              : 'Enter the verification code sent to your email'
            }
          </p>
        </div>

        <div className="space-y-4">
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
                />
              </div>
              <Button type="submit" disabled={isLoading || !email.trim() || !password.trim()} className="w-full">
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
                  className="text-center text-2xl tracking-widest"
                />
                <p className="text-sm text-muted-foreground text-center">
                  Enter the verification code sent to {email}
                </p>
              </div>
              <div className="space-y-2">
                <Button type="submit" disabled={isLoading || code.length !== 8} className="w-full">
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
                  className="w-full"
                >
                  Back
                </Button>
              </div>
            </form>
          )}

          {searchParams?.message && (
            <div className="p-4 bg-muted text-foreground text-center rounded-lg">
              <p
                className={
                  searchParams.type === 'info'
                    ? 'text-blue-500'
                    : searchParams.type === 'warning'
                    ? 'text-yellow-500'
                    : 'text-red-500'
                }
              >
                {searchParams.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
