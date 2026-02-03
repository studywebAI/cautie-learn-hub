'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface FillInBlankBlockProps {
  data: {
    text: string
    answers: string[]
    case_sensitive: boolean
  }
  onSubmit?: (answer: string[]) => void
  submitted?: boolean
  isCorrect?: boolean
}

export function FillInBlankBlock({ data, onSubmit, submitted, isCorrect }: FillInBlankBlockProps) {
  // Parse ... as blank markers
  const parts = data.text.split('...')
  const blankCount = parts.length - 1
  const [userAnswers, setUserAnswers] = useState<string[]>(Array(blankCount).fill(''))

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(userAnswers)
    }
  }

  const checkAnswers = () => {
    return userAnswers.every((answer, idx) => {
      const expected = data.answers[idx] || ''
      if (data.case_sensitive) {
        return answer.trim() === expected.trim()
      }
      return answer.trim().toLowerCase() === expected.trim().toLowerCase()
    })
  }

  const correct = submitted && isCorrect !== undefined ? isCorrect : (submitted ? checkAnswers() : undefined)

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Rendered text with clean underline inputs */}
        <p className="text-lg leading-loose">
          {parts.map((part, idx) => (
            <span key={idx}>
              {part}
              {idx < parts.length - 1 && (
                <span className="inline-flex items-center mx-1">
                  <span className="relative inline-block">
                    <input
                      type="text"
                      value={userAnswers[idx]}
                      onChange={(e) => {
                        const newAnswers = [...userAnswers]
                        newAnswers[idx] = e.target.value
                        setUserAnswers(newAnswers)
                      }}
                      disabled={submitted}
                      className={`
                        min-w-[80px] w-auto px-2 py-0.5 text-center text-base
                        bg-transparent border-0 border-b-2 
                        focus:outline-none focus:border-primary
                        ${submitted 
                          ? correct 
                            ? 'border-green-500 text-green-700' 
                            : 'border-red-500 text-red-700'
                          : 'border-foreground/40'
                        }
                      `}
                      style={{ width: `${Math.max(80, (userAnswers[idx]?.length || 8) * 10)}px` }}
                    />
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
                      ({idx + 1})
                    </span>
                  </span>
                </span>
              )}
            </span>
          ))}
        </p>

        {!submitted && (
          <Button 
            onClick={handleSubmit} 
            disabled={userAnswers.some(a => !a.trim())}
            className="mt-4"
          >
            Submit Answer
          </Button>
        )}

        {submitted && (
          <div className={`p-2 rounded ${correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {correct 
              ? 'Correct!' 
              : (
                <div>
                  <span>Incorrect. Correct answers: </span>
                  {data.answers.map((ans, idx) => (
                    <span key={idx}>
                      ({idx + 1}) {ans}{idx < data.answers.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              )
            }
          </div>
        )}
      </div>
    </Card>
  )
}
