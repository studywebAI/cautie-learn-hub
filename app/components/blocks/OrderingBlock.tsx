'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface OrderingBlockProps {
  data: {
    prompt: string
    items: string[]
    correct_order: number[]
  }
  onSubmit?: (answer: number[]) => void
  submitted?: boolean
  isCorrect?: boolean
}

export function OrderingBlock({ data, onSubmit, submitted, isCorrect }: OrderingBlockProps) {
  const [order, setOrder] = useState<number[]>(data.items.map((_, i) => i))

  const moveItem = (fromIndex: number, toIndex: number) => {
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

  const checkAnswer = (userOrder: number[]) => {
    return userOrder.every((item, index) => item === data.correct_order[index])
  }

  const correct = submitted && isCorrect !== undefined ? isCorrect : (submitted ? checkAnswer(order) : undefined)

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{data.prompt}</h3>

        <div className="space-y-2">
          {order.map((itemIndex, displayIndex) => (
            <div key={itemIndex} className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => displayIndex > 0 && moveItem(displayIndex, displayIndex - 1)}
                disabled={submitted || displayIndex === 0}
              >
                ↑
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => displayIndex < order.length - 1 && moveItem(displayIndex, displayIndex + 1)}
                disabled={submitted || displayIndex === order.length - 1}
              >
                ↓
              </Button>
              <span className="flex-1 p-2 bg-gray-100 rounded">
                {data.items[itemIndex]}
              </span>
            </div>
          ))}
        </div>

        {!submitted && (
          <Button onClick={handleSubmit}>
            Submit Answer
          </Button>
        )}

        {submitted && (
          <div className={`p-2 rounded ${correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {correct ? 'Correct!' : 'Incorrect. Check the order.'}
          </div>
        )}
      </div>
    </Card>
  )
}