"use client";

import React, { useContext, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AppContext, AppContextType } from "@/contexts/app-context";
import type { StudentAnalytics } from "@/lib/types";
import { useDictionary } from "@/contexts/app-context";
import { Clock, Target, BookOpen, TrendingUp, Award, Lightbulb } from "lucide-react";

const chartConfig = {
  "Study Time": {
    label: "Study Time (min)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const pieChartConfig = {
  completed: {
    label: "Completed",
    color: "hsl(var(--chart-2))",
  },
  remaining: {
    label: "Remaining",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

export const AnalyticsDashboard = React.memo(function AnalyticsDashboard() {
  const context = useContext(AppContext) as AppContextType;
  const { session } = context;
  const { dictionary } = useDictionary();
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!session?.user?.id) return;

      try {
        const params = new URLSearchParams();
        params.set('guestId', ''); // Empty for logged-in users

        const response = await fetch(`/api/analytics?${params}`);
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [session]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Progress & Analytics
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
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Progress & Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load analytics data.</p>
        </CardContent>
      </Card>
    );
  }

  const assignmentPieData = [
    { name: 'completed', value: analytics.completedAssignments, fill: 'var(--color-completed)' },
    { name: 'remaining', value: Math.max(0, analytics.totalAssignments - analytics.completedAssignments), fill: 'var(--color-remaining)' },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Time This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(analytics.totalStudyTime / 60 * 10) / 10}h</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalStudyTime} minutes total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgProgress}%</div>
            <Progress value={analytics.avgProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignment Completion</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.assignmentCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.completedAssignments}/{analytics.totalAssignments} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quiz Performance</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.quizPerformance.averageScore}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.quizPerformance.correctAnswers}/{analytics.quizPerformance.totalQuestions} correct
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Study Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Study Activity</CardTitle>
            <p className="text-sm text-muted-foreground">Minutes studied each day this week</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-60 w-full">
              <BarChart
                data={analytics.weeklyStudyTime}
                margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
                accessibilityLayer
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `${value}m`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="Study Time" fill="var(--color-Study Time)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Assignment Completion Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment Completion</CardTitle>
            <p className="text-sm text-muted-foreground">Progress on submitted assignments</p>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center">
              <ChartContainer config={pieChartConfig} className="h-48 w-48">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={assignmentPieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    strokeWidth={2}
                    startAngle={90}
                    endAngle={-270}
                  />
                </PieChart>
              </ChartContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-chart-2"></div>
                <span className="text-sm">Completed ({analytics.completedAssignments})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-chart-5"></div>
                <span className="text-sm">Remaining ({Math.max(0, analytics.totalAssignments - analytics.completedAssignments)})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Personalized Recommendations
          </CardTitle>
          <p className="text-sm text-muted-foreground">Based on your recent activity and performance</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Badge variant="secondary" className="mt-0.5">
                  {index + 1}
                </Badge>
                <p className="text-sm">{recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});