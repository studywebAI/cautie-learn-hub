'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface FillInBlankBlockProps {
  data: {
    text: string
    answers: string[]
    case_sensitive: boolean
  }
  onSubmit?: (answer: string) => void
  submitted?: boolean
  isCorrect?: boolean
}

export function FillInBlankBlock({ data, onSubmit, submitted, isCorrect }: FillInBlankBlockProps) {
  const [answer, setAnswer] = useState('')

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(answer)
    }
  }

  const checkAnswer = (userAnswer: string) => {
    const normalizedAnswer = data.case_sensitive ? userAnswer : userAnswer.toLowerCase()
    return data.answers.some(expected =>
      data.case_sensitive ? expected === normalizedAnswer : expected.toLowerCase() === normalizedAnswer
    )
  }

  const correct = submitted && isCorrect !== undefined ? isCorrect : (submitted ? checkAnswer(answer) : undefined)

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <p className="text-lg">
          {data.text.split('___').map((part, index, array) => (
            <span key={index}>
              {part}
              {index < array.length - 1 && (
                <Input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="inline-block w-32 mx-1"
                  placeholder="..."
                  disabled={submitted}
                />
              )}
            </span>
          ))}
        </p>

        {!submitted && (
          <Button onClick={handleSubmit} disabled={!answer.trim()}>
            Submit Answer
          </Button>
        )}

        {submitted && (
          <div className={`p-2 rounded ${correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {correct ? 'Correct!' : `Incorrect. Expected: ${data.answers.join(' or ')}`}
          </div>
        )}
      </div>
    </Card>
  )
}