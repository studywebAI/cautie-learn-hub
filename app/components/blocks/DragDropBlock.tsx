'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Pair {
  left: string
  right: string
}

interface DragDropBlockProps {
  data: {
    prompt: string
    pairs: Pair[]
  }
  onSubmit?: (answer: { [left: string]: string }) => void
  submitted?: boolean
  isCorrect?: boolean
}

export function DragDropBlock({ data, onSubmit, submitted, isCorrect }: DragDropBlockProps) {
  const [matches, setMatches] = useState<{ [left: string]: string }>({})

  const handleDrop = (left: string, right: string) => {
    setMatches(prev => ({
      ...prev,
      [left]: right
    }))
  }

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(matches)
    }
  }

  const checkAnswer = (userMatches: { [left: string]: string }) => {
    return data.pairs.every(pair => userMatches[pair.left] === pair.right)
  }

  const correct = submitted && isCorrect !== undefined ? isCorrect : (submitted ? checkAnswer(matches) : undefined)

  const availableRights = data.pairs
    .map(p => p.right)
    .filter(right => !Object.values(matches).includes(right))

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{data.prompt}</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Items:</h4>
            {data.pairs.map(pair => (
              <div
                key={pair.left}
                className="p-2 bg-gray-100 rounded cursor-move"
                draggable={!submitted}
                onDragStart={(e) => e.dataTransfer.setData('text/plain', pair.left)}
              >
                {pair.left}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Drop zones:</h4>
            {data.pairs.map(pair => (
              <div
                key={pair.left}
                className="p-2 border-2 border-dashed border-gray-300 rounded min-h-[40px] flex items-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const left = e.dataTransfer.getData('text/plain')
                  handleDrop(left, pair.right)
                }}
              >
                {matches[pair.left] || 'Drop here'}
              </div>
            ))}
          </div>
        </div>

        {!submitted && (
          <Button onClick={handleSubmit}>
            Submit Answer
          </Button>
        )}

        {submitted && (
          <div className={`p-2 rounded ${correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {correct ? 'Correct!' : 'Incorrect. Check your matches.'}
          </div>
        )}
      </div>
    </Card>
  )
}