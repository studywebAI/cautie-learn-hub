'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Loader from '@/components/ui/loader';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

const BRAND = '#6b7c4e'

type TopicAnalytics = {
  topicId: string
  topicName: string
  totalAttempts: number
  averageScore: number
  correctAnswers: number
  incorrectAnswers: number
  lastAttemptDate: string | null
}

type TrendData = {
  date: string
  averageScore: number
  attemptCount: number
}

type AnalyticsData = {
  quizResults: any[]
  topicAnalytics: TopicAnalytics[]
  strongTopics: TopicAnalytics[]
  weakTopics: TopicAnalytics[]
  scoreTrend: TrendData[]
  summary: {
    totalAttempts: number
    averageScore: number
  }
}

export function StudentQuizAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/student/analytics/quiz-results', {
          cache: 'no-store',
        })
        if (!res.ok) {
          throw new Error(`Failed to load analytics (${res.status})`)
        }
        const json = await res.json()
        if (!cancelled) {
          setData(json)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load analytics')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <CautieLoader label="Loading quiz analytics" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!data || data.topicAnalytics.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No quiz results yet. Start taking quizzes to see your analytics.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Score Trend Chart */}
      {data.scoreTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score Trend Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.scoreTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: 'var(--muted-foreground)' }}
                />
                <YAxis
                  domain={[0, 100]}
                  style={{ fontSize: '12px' }}
                  tick={{ fill: 'var(--muted-foreground)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => {
                    if (typeof value === 'number') {
                      return [`${value}%`, 'Score']
                    }
                    return value
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="averageScore"
                  stroke={BRAND}
                  dot={{ fill: BRAND, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Avg Score (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Strong vs Weak Topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strong Topics */}
        {data.strongTopics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Strong Topics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data.strongTopics}
                  layout="vertical"
                  margin={{ left: 150 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis
                    dataKey="topicName"
                    type="category"
                    width={150}
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    formatter={(value) => {
                      if (typeof value === 'number') {
                        return [`${value}%`, 'Score']
                      }
                      return value
                    }}
                  />
                  <Bar dataKey="averageScore" fill="#10b981" radius={[0, 8, 8, 0]}>
                    {data.strongTopics.map((topic, index) => (
                      <Cell key={`cell-${index}`} fill="#10b981" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Weak Topics */}
        {data.weakTopics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Areas for Improvement</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data.weakTopics}
                  layout="vertical"
                  margin={{ left: 150 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis
                    dataKey="topicName"
                    type="category"
                    width={150}
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    formatter={(value) => {
                      if (typeof value === 'number') {
                        return [`${value}%`, 'Score']
                      }
                      return value
                    }}
                  />
                  <Bar dataKey="averageScore" fill="#ef4444" radius={[0, 8, 8, 0]}>
                    {data.weakTopics.map((topic, index) => (
                      <Cell key={`cell-${index}`} fill="#ef4444" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* All Topics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Topics Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold">Topic</th>
                  <th className="text-center py-2 px-3 font-semibold">Attempts</th>
                  <th className="text-center py-2 px-3 font-semibold">Correct</th>
                  <th className="text-center py-2 px-3 font-semibold">Avg Score</th>
                  <th className="text-left py-2 px-3 font-semibold">Last Attempt</th>
                </tr>
              </thead>
              <tbody>
                {data.topicAnalytics
                  .sort((a, b) => b.totalAttempts - a.totalAttempts)
                  .map((topic) => (
                    <tr key={topic.topicId} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-3 font-medium text-foreground truncate">
                        {topic.topicName}
                      </td>
                      <td className="py-3 px-3 text-center text-muted-foreground">
                        {topic.totalAttempts}
                      </td>
                      <td className="py-3 px-3 text-center text-muted-foreground">
                        {topic.correctAnswers}/{topic.totalAttempts}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full surface-chip font-semibold text-foreground">
                          {topic.averageScore}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-sm text-muted-foreground">
                        {topic.lastAttemptDate
                          ? new Date(topic.lastAttemptDate).toLocaleDateString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
