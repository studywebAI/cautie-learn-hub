"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import type { ClassAnalytics } from "@/lib/types";
import { TrendingUp, Users, BookOpen, AlertTriangle, Target, BarChart3, RefreshCw } from "lucide-react";

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

const pieChartConfig = {
  active: {
    label: "Active Students",
    color: "hsl(var(--chart-2))",
  },
  inactive: {
    label: "Inactive Students",
    color: "hsl(var(--chart-5))",
  },
} satisfies any;

interface ClassAnalyticsDashboardProps {
  classId: string;
}

export function ClassAnalyticsDashboard({ classId }: ClassAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<ClassAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/classes/${classId}/analytics`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [classId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Class Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-32 bg-muted rounded"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="h-20 bg-muted rounded"></div>
                <div className="h-20 bg-muted rounded"></div>
                <div className="h-20 bg-muted rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Class Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">{error || 'Unable to load analytics data.'}</p>
            <Button onClick={fetchAnalytics} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { engagementMetrics, performanceTrends, atRiskStudents, comparativeAnalysis, classOverview, insights } = analytics;

  // Prepare data for charts
  const performanceData = performanceTrends.map(trend => ({
    date: trend.date,
    'Average Score': Math.round(trend.averageScore),
    'Completion Rate': Math.round(trend.completionRate)
  }));

  const engagementPieData = [
    { name: 'active', value: engagementMetrics.activeStudentsCount, fill: 'var(--color-active)' },
    { name: 'inactive', value: Math.max(0, classOverview.totalStudents - engagementMetrics.activeStudentsCount), fill: 'var(--color-inactive)' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-headline">Class Analytics</h2>
          <p className="text-muted-foreground">Comprehensive insights into student engagement and performance</p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classOverview.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {engagementMetrics.activeStudentsCount} active this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Study Time</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(engagementMetrics.averageStudyTime)}min</div>
            <p className="text-xs text-muted-foreground">
              Per student this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignment Completion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(classOverview.overallCompletionRate)}%</div>
            <Progress value={classOverview.overallCompletionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At-Risk Students</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{atRiskStudents.length}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends (Last 30 Days)</CardTitle>
            <p className="text-sm text-muted-foreground">Average scores and completion rates over time</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-60 w-full">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="Average Score"
                  stroke="var(--color-Average Score)"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Completion Rate"
                  stroke="var(--color-Completion Rate)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Student Engagement */}
        <Card>
          <CardHeader>
            <CardTitle>Student Engagement</CardTitle>
            <p className="text-sm text-muted-foreground">Active vs inactive students this week</p>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center mb-4">
              <ChartContainer config={pieChartConfig} className="h-48 w-48">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={engagementPieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    strokeWidth={2}
                  />
                </PieChart>
              </ChartContainer>
            </div>
            <div className="flex justify-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-chart-2"></div>
                <span className="text-sm">Active ({engagementMetrics.activeStudentsCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-chart-5"></div>
                <span className="text-sm">Inactive ({Math.max(0, classOverview.totalStudents - engagementMetrics.activeStudentsCount)})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Students */}
      {atRiskStudents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              At-Risk Students
            </CardTitle>
            <p className="text-sm text-muted-foreground">Students who may need additional support</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {atRiskStudents.slice(0, 5).map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{student.name}</span>
                      <Badge
                        variant={student.riskLevel === 'high' ? 'destructive' : student.riskLevel === 'medium' ? 'secondary' : 'outline'}
                      >
                        {student.riskLevel} risk
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {student.reasons.join(', ')}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>Engagement: {Math.round(student.engagementScore)}%</div>
                    <div>Performance: {Math.round(student.performanceScore)}%</div>
                  </div>
                </div>
              ))}
              {atRiskStudents.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  And {atRiskStudents.length - 5} more students...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparative Analysis */}
      {comparativeAnalysis.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Comparative Analysis
            </CardTitle>
            <p className="text-sm text-muted-foreground">How this class compares to your other classes</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comparativeAnalysis.map((classData) => (
                <div key={classData.className} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <span className="font-medium">{classData.className}</span>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{classData.studentCount} students</span>
                      <span>Avg Score: {Math.round(classData.averageScore)}%</span>
                      <span>Completion: {Math.round(classData.completionRate)}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      Engagement: {Math.round(classData.engagementRate)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>AI Insights & Recommendations</CardTitle>
          <p className="text-sm text-muted-foreground">Based on current class data and trends</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Badge variant="secondary" className="mt-0.5">
                  {index + 1}
                </Badge>
                <p className="text-sm">{insight}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}