'use client'

interface DividerBlockProps {
  data: {
    style: 'line' | 'space' | 'page_break'
  }
}

export function DividerBlock({ data }: DividerBlockProps) {
  switch (data.style) {
    case 'line':
      return <hr className="my-4 border-gray-300" />
    case 'space':
      return <div className="my-8" />
    case 'page_break':
      return <div className="page-break my-4 border-t-2 border-gray-400" />
    default:
      return <hr className="my-4 border-gray-300" />
  }
}