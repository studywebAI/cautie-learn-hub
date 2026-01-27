"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { Task } from "@/lib/types";
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import { useState, useMemo } from "react";
import { useDictionary } from "@/contexts/app-context";

type TodayPlanProps = {
  tasks: Task[];
};

export function TodayPlan({ tasks: initialTasks }: TodayPlanProps) {
  const [currentTasks, setCurrentTasks] = useState<Task[]>(initialTasks);
  const { dictionary } = useDictionary();

  const completedTasks = useMemo(
    () => currentTasks.filter((task) => task.completed).length,
    [currentTasks]
  );
  const totalTasks = currentTasks.length;
  const completionPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleTaskToggle = (taskId: string) => {
    setCurrentTasks(
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const chartData = [
    { name: "completion", value: completionPercentage, fill: "hsl(var(--primary))" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{dictionary.dashboard.todayPlan.title}</CardTitle>
        <CardDescription>
          {dictionary.dashboard.todayPlan.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            {currentTasks.length > 0 ? currentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Checkbox
                    id={`task-${task.id}`}
                    checked={task.completed}
                    onCheckedChange={() => handleTaskToggle(task.id)}
                    aria-label={`Mark ${task.title} as completed`}
                  />
                  <label
                    htmlFor={`task-${task.id}`}
                    className={`font-medium ${
                      task.completed ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {task.title}
                  </label>
                </div>
                <span className="text-sm text-muted-foreground">
                  {task.duration} min
                </span>
              </div>
            )) : (
              <p className="text-center text-sm text-muted-foreground py-8">No tasks planned by the AI for today.</p>
            )}
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="relative h-40 w-40">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                    innerRadius="80%"
                    outerRadius="100%"
                    data={chartData}
                    startAngle={90}
                    endAngle={-270}
                    >
                    <PolarAngleAxis
                        type="number"
                        domain={[0, 100]}
                        angleAxisId={0}
                        tick={false}
                    />
                    <RadialBar
                        background
                        dataKey="value"
                        cornerRadius={10}
                        className="fill-primary"
                    />
                    </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold font-headline text-primary">
                        {completionPercentage}%
                    </span>
                    <span className="text-sm text-muted-foreground">{dictionary.dashboard.todayPlan.completed}</span>
                </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
