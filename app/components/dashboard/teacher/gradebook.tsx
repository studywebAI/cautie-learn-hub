'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Student {
  id: string
  full_name: string
  email: string
}

interface Assignment {
  id: string
  title: string
  due_date: string
  max_points: number
  grading_category?: {
    name: string
    weight: number
  }
}

interface Submission {
  id: string
  user_id: string
  assignment_id: string
  grade?: number
  calculated_grade?: number
  status: string
  submitted_at?: string
  is_late?: boolean
}

interface GradebookProps {
  classId: string
}

export function Gradebook({ classId }: GradebookProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [grades, setGrades] = useState<Record<string, Record<string, Submission>>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGradebookData()
  }, [classId])

  const loadGradebookData = async () => {
    try {
      // Load students
      const studentsRes = await fetch(`/api/classes/${classId}/members`)
      const studentsData = await studentsRes.json()
      setStudents(studentsData)

      // Load assignments
      const assignmentsRes = await fetch('/api/assignments')
      const assignmentsData = await assignmentsRes.json()
      const classAssignments = assignmentsData.filter((a: any) => a.class_id === classId)
      setAssignments(classAssignments)

      // Load submissions
      const submissionsRes = await fetch('/api/submissions')
      const submissionsData = await submissionsRes.json()
      const classSubmissions = submissionsData.filter((s: any) =>
        classAssignments.some((a: any) => a.id === s.assignment_id)
      )
      setSubmissions(classSubmissions)

      // Organize grades by student and assignment
      const gradesMap: Record<string, Record<string, Submission>> = {}
      classSubmissions.forEach((submission: Submission) => {
        if (!gradesMap[submission.user_id]) {
          gradesMap[submission.user_id] = {}
        }
        gradesMap[submission.user_id][submission.assignment_id] = submission
      })
      setGrades(gradesMap)

    } catch (error) {
      console.error('Error loading gradebook data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGradeForStudent = (studentId: string, assignmentId: string) => {
    return grades[studentId]?.[assignmentId]
  }

  const calculateOverallGrade = (studentId: string) => {
    const studentGrades = grades[studentId] || {}
    let totalWeightedScore = 0
    let totalWeight = 0

    assignments.forEach(assignment => {
      const submission = studentGrades[assignment.id]
      if (submission?.calculated_grade !== undefined) {
        const weight = assignment.grading_category?.weight || 1
        totalWeightedScore += (submission.calculated_grade / (assignment.max_points || 100)) * weight
        totalWeight += weight
      }
    })

    if (totalWeight === 0) return null
    return (totalWeightedScore / totalWeight) * 100
  }

  if (loading) {
    return <div>Loading gradebook...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Gradebook</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                {assignments.map(assignment => (
                  <TableHead key={assignment.id} className="text-center">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{assignment.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {assignment.grading_category?.name || 'Ungraded'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Max: {assignment.max_points || 100}
                      </div>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-center">Overall Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map(student => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{student.full_name}</div>
                      <div className="text-sm text-muted-foreground">{student.email}</div>
                    </div>
                  </TableCell>
                  {assignments.map(assignment => {
                    const submission = getGradeForStudent(student.id, assignment.id)
                    return (
                      <TableCell key={assignment.id} className="text-center">
                        {submission ? (
                          <div className="space-y-1">
                            <div className="font-medium">
                              {submission.calculated_grade !== undefined
                                ? `${submission.calculated_grade}/${assignment.max_points || 100}`
                                : submission.grade !== undefined
                                ? `${submission.grade}/${assignment.max_points || 100}`
                                : '—'
                              }
                            </div>
                            <Badge
                              variant={
                                submission.status === 'graded' ? 'default' :
                                submission.status === 'submitted' ? 'secondary' :
                                'outline'
                              }
                            >
                              {submission.status}
                            </Badge>
                            {submission.is_late && (
                              <Badge variant="destructive">Late</Badge>
                            )}
                          </div>
                        ) : (
                          <div className="text-muted-foreground">—</div>
                        )}
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-center font-bold">
                    {calculateOverallGrade(student.id)?.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}