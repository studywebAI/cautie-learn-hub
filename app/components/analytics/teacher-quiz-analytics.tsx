'use client'

import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Loader from '@/components/ui/loader';
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

const BRAND = '#6b7c4e'

type ClassAnalytics = {
  classId: string
  className: string
  totalStudents: number
  quizzes: Array<{
    quizId: string
    quizTitle: string
    topicId: string
    topicName: string
    averageScore: number
    completionRate: number
    totalAttempts: number
    errorRate: number
  }>
  topicErrorRates: Array<{
    topicId: string
    topicName: string
    errorRate: number
    averageScore: number
    attemptCount: number
  }>
}

type AnalyticsData = {
  classes: ClassAnalytics[]
}

export function TeacherQuizAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedClass, setExpandedClass] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/teacher/analytics/quiz-results', {
          cache: 'no-store',
        })
        if (!res.ok) {
          throw new Error(`Failed to load analytics (${res.status})`)
        }
        const json = await res.json()
        if (!cancelled) {
          setData(json)
          if (json.classes && json.classes.length > 0) {
            setExpandedClass(json.classes[0].classId)
          }
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
        <CautieLoader label="Loading class analytics" />
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

  if (!data || data.classes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No class data available. Make sure you are teaching at least one class.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {data.classes.map((classData) => (
        <div key={classData.classId} className="space-y-3">
          <button
            onClick={() =>
              setExpandedClass(
                expandedClass === classData.classId ? null : classData.classId
              )
            }
            className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted rounded-lg transition-colors"
          >
            <div className="text-left">
              <h3 className="font-semibold text-foreground">{classData.className}</h3>
              <p className="text-sm text-muted-foreground">
                {classData.totalStudents} student{classData.totalStudents !== 1 ? 's' : ''} • {classData.quizzes.length} quizzes
              </p>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground transition-transform ${
                expandedClass === classData.classId ? 'rotate-180' : ''
              }`}
            />
          </button>

          {expandedClass === classData.classId && (
            <div className="space-y-4 ml-0 md:ml-2">
              {/* Topic Error Rates Chart */}
              {classData.topicErrorRates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Topics with Highest Error Rates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={classData.topicErrorRates.slice(0, 8)}
                        margin={{ left: 150, right: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis
                          dataKey="topicName"
                          type="category"
                          width={150}
                          style={{ fontSize: '12px' }}
                        />
                        <Tooltip
                          formatter={(value) => {
                            if (typeof value === 'number') {
                              return [`${value}%`, 'Error Rate']
                            }
                            return value
                          }}
                        />
                        <Bar dataKey="errorRate" fill="#ef4444" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Quiz Completion Rates */}
              {classData.quizzes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quiz Performance Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {classData.quizzes
                        .sort((a, b) => b.averageScore - a.averageScore)
                        .map((quiz) => (
                          <div
                            key={quiz.quizId}
                            className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground truncate">
                                  {quiz.quizTitle}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {quiz.topicName}
                                </p>
                              </div>
                              <div className="text-right shrink-0 ml-4">
                                <p className="text-lg font-semibold" style={{ color: BRAND }}>
                                  {quiz.averageScore}%
                                </p>
                                <p className="text-xs text-muted-foreground">avg score</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <p className="text-muted-foreground">Completion</p>
                                <p className="font-semibold text-foreground">
                                  {quiz.completionRate}%
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Error Rate</p>
                                <p className="font-semibold text-red-600">
                                  {quiz.errorRate}%
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Attempts</p>
                                <p className="font-semibold text-foreground">
                                  {quiz.totalAttempts}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Topic Details Table */}
              {classData.topicErrorRates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Topic Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-semibold">Topic</th>
                            <th className="text-center py-2 px-3 font-semibold">Attempts</th>
                            <th className="text-center py-2 px-3 font-semibold">
                              Avg Score
                            </th>
                            <th className="text-center py-2 px-3 font-semibold">
                              Error Rate
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {classData.topicErrorRates.map((topic) => (
                            <tr key={topic.topicId} className="border-b hover:bg-muted/50">
                              <td className="py-3 px-3 font-medium text-foreground">
                                {topic.topicName}
                              </td>
                              <td className="py-3 px-3 text-center text-muted-foreground">
                                {topic.attemptCount}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span
                                  className="inline-flex items-center justify-center w-12 h-12 rounded-full font-semibold text-sm"
                                  style={{
                                    backgroundColor: `${BRAND}1a`,
                                    color: BRAND,
                                  }}
                                >
                                  {topic.averageScore}%
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="font-semibold text-red-600">
                                  {topic.errorRate}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
