'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowUp, ArrowDown } from 'lucide-react'

interface OrderingBlockProps {
  data: {
    prompt: string
    items: string[]
    correct_order?: number[] // If not provided, items array order is correct
  }
  onSubmit?: (answer: number[]) => void
  submitted?: boolean
  isCorrect?: boolean
}

export function OrderingBlock({ data, onSubmit, submitted, isCorrect }: OrderingBlockProps) {
  // The correct order is the order items were entered (0, 1, 2, ...)
  // For students, we shuffle the display order initially
  const correctOrder = useMemo(() => 
    data.correct_order || data.items.map((_, i) => i), 
    [data.correct_order, data.items]
  )
  
  // Shuffle items for student view
  const shuffledIndices = useMemo(() => {
    const indices = data.items.map((_, i) => i)
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    return indices
  }, [data.items.length])
  
  const [order, setOrder] = useState<number[]>(shuffledIndices)

  const moveItem = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= order.length) return
    
    const newOrder = [...order]
    const [moved] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, moved)
    setOrder(newOrder)
  }

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(order)
    }
  }

  const checkAnswer = () => {
    return order.every((item, index) => item === correctOrder[index])
  }

  const correct = submitted && isCorrect !== undefined ? isCorrect : (submitted ? checkAnswer() : undefined)

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{data.prompt}</h3>

        <div className="space-y-2">
          {order.map((itemIndex, displayIndex) => {
            const isInCorrectPosition = submitted && itemIndex === correctOrder[displayIndex]
            
            return (
              <div 
                key={itemIndex} 
                className={`
                  flex items-center gap-3 p-3 rounded-lg border transition-colors
                  ${submitted 
                    ? isInCorrectPosition 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                    : 'bg-muted/50 border-border hover:border-primary/50'
                  }
                `}
              >
                <div className="flex flex-col gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveItem(displayIndex, 'up')}
                    disabled={submitted || displayIndex === 0}
                    className="h-6 w-6 p-0"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveItem(displayIndex, 'down')}
                    disabled={submitted || displayIndex === order.length - 1}
                    className="h-6 w-6 p-0"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>
                
                <span className="text-sm font-medium text-muted-foreground w-6">
                  {displayIndex + 1}.
                </span>
                
                <span className="flex-1">
                  {data.items[itemIndex]}
                </span>
                
                {submitted && (
                  <span className={`text-xs font-medium ${isInCorrectPosition ? 'text-green-600' : 'text-red-600'}`}>
                    {isInCorrectPosition ? '✓' : '✗'}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {!submitted && (
          <Button onClick={handleSubmit}>
            Submit Answer
          </Button>
        )}

        {submitted && (
          <div className={`p-2 rounded ${correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {correct ? 'Correct!' : 'Incorrect. Try to find the right order.'}
          </div>
        )}
      </div>
    </Card>
  )
}
