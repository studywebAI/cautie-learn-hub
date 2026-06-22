'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircle, CheckCircle2, QrCode, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TwoFASetupProps {
  isDutch?: boolean
}

export function TwoFASetup({ isDutch = false }: TwoFASetupProps) {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)
  const [enrollmentStep, setEnrollmentStep] = useState<'idle' | 'showing-qr' | 'verifying'>('idle')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const tr = (values: Partial<Record<string, string>>) => values[isDutch ? 'nl' : 'en'] || values.en || ''

  // Check 2FA status on mount
  useEffect(() => {
    const check2FAStatus = async () => {
      try {
        const response = await fetch('/api/auth/2fa/status')
        if (!response.ok) throw new Error('Failed to fetch status')
        const data = await response.json()
        setIs2FAEnabled(data.enabled)
      } catch (err) {
        console.error('Failed to check 2FA status:', err)
      } finally {
        setIsLoading(false)
      }
    }

    void check2FAStatus()
  }, [])

  const handleStartEnrollment = async () => {
    setError('')
    setSuccess('')
    setIsEnrolling(true)
    try {
      const response = await fetch('/api/auth/2fa/enroll', { method: 'POST' })
      if (!response.ok) throw new Error('Failed to generate TOTP secret')
      const data = await response.json()
      setSecret(data.secret)
      setQrCode(data.qrCode)
      setEnrollmentStep('showing-qr')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start enrollment')
    } finally {
      setIsEnrolling(false)
    }
  }

  const handleVerifyEnrollment = async () => {
    setError('')
    setSuccess('')
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      setError(tr({ en: 'Please enter a valid 6-digit code', nl: 'Voer een geldige 6-cijferige code in' }))
      return
    }

    setEnrollmentStep('verifying')
    try {
      const response = await fetch('/api/auth/2fa/verify-enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, code: verificationCode }),
      })
      if (!response.ok) throw new Error('Invalid verification code')
      setSuccess(tr({ en: '2FA enabled successfully!', nl: '2FA ingeschakeld!' }))
      setIs2FAEnabled(true)
      setEnrollmentStep('idle')
      setVerificationCode('')
      setSecret('')
      setQrCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
      setEnrollmentStep('showing-qr')
    }
  }

  const handleDisable2FA = async () => {
    setError('')
    setSuccess('')
    if (!disableCode.trim() || disableCode.length !== 6) {
      setError(tr({ en: 'Please enter a valid 6-digit code', nl: 'Voer een geldige 6-cijferige code in' }))
      return
    }

    setIsDisabling(true)
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode }),
      })
      if (!response.ok) throw new Error('Invalid verification code')
      setSuccess(tr({ en: '2FA disabled successfully', nl: '2FA uitgeschakeld' }))
      setIs2FAEnabled(false)
      setDisableCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA')
    } finally {
      setIsDisabling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Spinner size={20} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 surface-panel shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {tr({ en: 'Two-Factor Authentication', nl: 'Twee-factor authenticatie' })}
          </CardTitle>
          <CardDescription>
            {tr({
              en: 'Add an extra layer of security to your account using an authenticator app.',
              nl: 'Voeg een extra beveiligingslaag toe met een authenticator-app.',
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status section */}
          <div className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/20">
            {is2FAEnabled ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">{tr({ en: 'Enabled', nl: 'Ingeschakeld' })}</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium">{tr({ en: 'Disabled', nl: 'Uitgeschakeld' })}</span>
              </>
            )}
          </div>

          {/* Error/Success messages */}
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
              {success}
            </div>
          )}

          {!is2FAEnabled ? (
            // Enrollment flow
            <div className="space-y-4">
              {enrollmentStep === 'idle' && (
                <Button
                  onClick={handleStartEnrollment}
                  disabled={isEnrolling}
                  className="w-full"
                >
                  {isEnrolling ? (
                    <>
                      <Spinner size={16} className="mr-2" />
                      {tr({ en: 'Starting...', nl: 'Bezig...' })}
                    </>
                  ) : (
                    tr({ en: 'Enable 2FA', nl: '2FA inschakelen' })
                  )}
                </Button>
              )}

              {enrollmentStep === 'showing-qr' && (
                <>
                  <div className="space-y-2">
                    <Label>{tr({ en: 'Step 1: Scan QR Code', nl: 'Stap 1: QR-code scannen' })}</Label>
                    <p className="text-sm text-muted-foreground">
                      {tr({
                        en: 'Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)',
                        nl: 'Scan deze QR-code met je authenticator-app (Google Authenticator, Authy, etc.)',
                      })}
                    </p>
                    {qrCode && (
                      <div className="flex justify-center bg-white p-4 rounded-lg">
                        <img src={qrCode} alt="2FA QR Code" className="h-48 w-48" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{tr({ en: 'Manual entry (if QR scan fails)', nl: 'Handmatig invoeren (als QR-scan mislukt)' })}</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-lg border border-border bg-muted/50 p-3 font-mono text-sm break-all">
                        {secret}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (secret) {
                            void navigator.clipboard.writeText(secret)
                            setSuccess(tr({ en: 'Copied to clipboard', nl: 'Gekopieerd' }))
                          }
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verify-code">{tr({ en: 'Step 2: Enter verification code', nl: 'Stap 2: Verificatiecode invoeren' })}</Label>
                    <p className="text-sm text-muted-foreground">
                      {tr({
                        en: 'Enter the 6-digit code from your authenticator app',
                        nl: 'Voer de 6-cijferige code uit je app in',
                      })}
                    </p>
                    <Input
                      id="verify-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="h-12 text-center text-2xl tracking-widest"
                      disabled={enrollmentStep === 'verifying'}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleVerifyEnrollment}
                      disabled={verificationCode.length !== 6 || enrollmentStep === 'verifying'}
                      className="flex-1"
                    >
                      {enrollmentStep === 'verifying' ? (
                        <>
                          <Spinner size={16} className="mr-2" />
                          {tr({ en: 'Verifying...', nl: 'Verifiëren...' })}
                        </>
                      ) : (
                        tr({ en: 'Verify & Enable', nl: 'Verifiëren & inschakelen' })
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEnrollmentStep('idle')
                        setVerificationCode('')
                        setSecret('')
                        setQrCode('')
                        setError('')
                      }}
                      disabled={enrollmentStep === 'verifying'}
                    >
                      {tr({ en: 'Cancel', nl: 'Annuleren' })}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            // Disable flow
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {tr({
                  en: 'To disable 2FA, enter a code from your authenticator app as verification.',
                  nl: 'Voer een code in van je authenticator-app om 2FA uit te schakelen.',
                })}
              </p>
              <div className="space-y-2">
                <Label htmlFor="disable-code">{tr({ en: 'Verification code', nl: 'Verificatiecode' })}</Label>
                <Input
                  id="disable-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="h-12 text-center text-2xl tracking-widest"
                  disabled={isDisabling}
                />
              </div>
              <Button
                variant="destructive"
                onClick={handleDisable2FA}
                disabled={disableCode.length !== 6 || isDisabling}
                className="w-full"
              >
                {isDisabling ? (
                  <>
                    <Spinner size={16} className="mr-2" />
                    {tr({ en: 'Disabling...', nl: 'Bezig...' })}
                  </>
                ) : (
                  tr({ en: 'Disable 2FA', nl: '2FA uitschakelen' })
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
