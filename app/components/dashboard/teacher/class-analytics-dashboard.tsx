"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { AnalyticsWarning, ClassAnalytics } from "@/lib/types";
import { AlertTriangle, BarChart3, RefreshCw } from "lucide-react";

interface ClassAnalyticsDashboardProps {
  classId: string;
}

const chartConfig = {
  "Average Score": {
    label: "Average Score",
    color: "hsl(var(--primary))",
  },
  "Completion Rate": {
    label: "Completion Rate (%)",
    color: "hsl(var(--chart-2))",
  },
} satisfies any;

function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "-";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h}h ${r}m`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function warningVariant(severity: AnalyticsWarning["severity"]): "destructive" | "secondary" | "outline" {
  if (severity === "high") return "destructive";
  if (severity === "medium") return "secondary";
  return "outline";
}

export function ClassAnalyticsDashboard({ classId }: ClassAnalyticsDashboardProps) {
  const searchParams = useSearchParams();
  const [analytics, setAnalytics] = useState<ClassAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState("all");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("all");
  const deepLinkedStudentId = searchParams?.get("studentId") || "all";

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/classes/${classId}/analytics`);
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [classId]);

  useEffect(() => {
    if (!deepLinkedStudentId || deepLinkedStudentId === "all") return;
    setSelectedStudentId(deepLinkedStudentId);
  }, [deepLinkedStudentId]);

  const studentOptions = useMemo(() => {
    if (!analytics) return [];
    return analytics.studentRows
      .map((row) => ({ id: row.studentId, name: row.studentName }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [analytics]);

  const filteredWarnings = useMemo(() => {
    if (!analytics) return [];
    return analytics.warnings.filter((warning) => {
      if (selectedStudentId !== "all" && warning.studentId !== selectedStudentId) return false;
      if (selectedSubjectId !== "all" && warning.subjectId !== selectedSubjectId) return false;
      if (selectedAssignmentId !== "all" && warning.assignmentId !== selectedAssignmentId) return false;
      return true;
    });
  }, [analytics, selectedStudentId, selectedSubjectId, selectedAssignmentId]);

  const filteredStudentRows = useMemo(() => {
    if (!analytics) return [];
    return analytics.studentRows.filter((row) => selectedStudentId === "all" || row.studentId === selectedStudentId);
  }, [analytics, selectedStudentId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-52 rounded bg-muted" />
            <div className="h-24 rounded bg-muted" />
            <div className="h-24 rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">{error || "Unable to load analytics data."}</p>
          <Button onClick={fetchAnalytics} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { classOverview, engagementMetrics, performanceTrends, insights } = analytics;
  const performanceData = performanceTrends.map((trend) => ({
    date: trend.date,
    "Average Score": Math.round(trend.averageScore),
    "Completion Rate": Math.round(trend.completionRate),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-headline">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Student-level and class-level signals, including speed and paste warnings.
          </p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classOverview.totalStudents}</div>
            <p className="text-xs text-muted-foreground">{engagementMetrics.activeStudentsCount} active this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Study Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(engagementMetrics.averageStudyTime)}m</div>
            <p className="text-xs text-muted-foreground">Per student / week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(classOverview.overallCompletionRate)}%</div>
            <Progress value={classOverview.overallCompletionRate} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.warnings.length}</div>
            <p className="text-xs text-muted-foreground">Suspicious speed/paste/AI signals</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Trend (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
              <YAxis yAxisId="score" />
              <YAxis yAxisId="completion" orientation="right" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line yAxisId="score" type="monotone" dataKey="Average Score" stroke="var(--color-Average Score)" strokeWidth={2} />
              <Line yAxisId="completion" type="monotone" dataKey="Completion Rate" stroke="var(--color-Completion Rate)" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm">
              Student
              <select
                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                <option value="all">All students</option>
                {studentOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Subject
              <select
                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
              >
                <option value="all">All subjects</option>
                {analytics.subjects.map((s) => (
                  <option key={s.subjectId} value={s.subjectId}>{s.subjectTitle}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Assignment
              <select
                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5"
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
              >
                <option value="all">All assignments</option>
                {analytics.assignmentSpeeds.map((a) => (
                  <option key={a.assignmentId} value={a.assignmentId}>{a.assignmentTitle}</option>
                ))}
              </select>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Warnings ({filteredWarnings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredWarnings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No warnings for current filters.</p>
          ) : (
            <div className="space-y-3">
              {filteredWarnings.map((warning) => (
                <div key={warning.id} className="rounded-lg border p-3">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant={warningVariant(warning.severity)}>{warning.severity}</Badge>
                    <Badge variant="outline">{warning.type}</Badge>
                    <span className="font-medium">{warning.studentName}</span>
                    {warning.assignmentTitle ? <span className="text-sm text-muted-foreground">| {warning.assignmentTitle}</span> : null}
                    {warning.subjectTitle ? <span className="text-sm text-muted-foreground">| {warning.subjectTitle}</span> : null}
                  </div>
                  <p className="text-sm">{warning.message}</p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {warning.studentSeconds ? <span>Student: {formatDuration(warning.studentSeconds)}</span> : null}
                    {warning.classAverageSeconds ? <span>Class avg: {formatDuration(warning.classAverageSeconds)}</span> : null}
                    <span>{formatDateTime(warning.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3">Student</th>
                  <th className="py-2 pr-3">Completion</th>
                  <th className="py-2 pr-3">Avg Grade</th>
                  <th className="py-2 pr-3">Open Reviews</th>
                  <th className="py-2 pr-3">Warnings</th>
                  <th className="py-2 pr-3">Last Activity</th>
                  <th className="py-2 pr-3">Last Submission</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudentRows.map((row) => (
                  <tr key={row.studentId} className="border-b align-top">
                    <td className="py-2 pr-3 font-medium">{row.studentName}</td>
                    <td className="py-2 pr-3">{Math.round(row.completionRate)}%</td>
                    <td className="py-2 pr-3">{row.averageGrade === null ? '-' : `${Math.round(row.averageGrade)}%`}</td>
                    <td className="py-2 pr-3">{row.pendingOpenReviews}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={row.warningCount > 0 ? "destructive" : "outline"}>{row.warningCount}</Badge>
                    </td>
                    <td className="py-2 pr-3">{formatDateTime(row.lastActivityAt)}</td>
                    <td className="py-2 pr-3">{formatDateTime(row.lastSubmissionAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subjects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {analytics.subjects.map((subject) => (
              <div key={subject.subjectId} className="rounded-lg border p-3">
                <div className="font-medium">{subject.subjectTitle}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {subject.submissionsCount} submissions | {subject.activeStudents} active students | {subject.totalStudyMinutes}m study
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {insights.map((insight, idx) => (
              <div key={idx} className="rounded-md bg-muted/50 p-3 text-sm">{insight}</div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
