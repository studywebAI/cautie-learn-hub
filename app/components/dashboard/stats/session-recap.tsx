"use client"

import { useDictionary } from "@/contexts/app-context";
import { SessionRecapData } from "@/lib/types";
import { Button } from "../../ui/button";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "../../ui/chart";
import { Pie, PieChart } from "recharts";
import { CheckCircle, Clock, FileQuestion, Target, BookOpen } from "lucide-react";


const chartConfig = {
  correct: {
    label: "Correct",
    color: "hsl(var(--chart-2))",
  },
  incorrect: {
    label: "Incorrect",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

type SessionRecapProps = {
  sessionRecap: SessionRecapData | null;
};

export function SessionRecap({ sessionRecap }: SessionRecapProps) {
  const { dictionary } = useDictionary();

  if (!sessionRecap) {
    return (
        <div className="flex flex-col items-center justify-center text-center h-full bg-muted/50 p-6 rounded-lg">
            <FileQuestion className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">No Session Data</h3>
            <p className="text-sm text-muted-foreground">Complete a quiz to see your results here.</p>
        </div>
    );
  }

  const { score, correctAnswers, totalQuestions, timeTaken } = sessionRecap;
  const incorrectAnswers = totalQuestions - correctAnswers;

  const chartData = [
    { name: 'correct', value: correctAnswers, fill: 'var(--color-correct)' },
    { name: 'incorrect', value: incorrectAnswers, fill: 'var(--color-incorrect)' },
  ];
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }

  return (
    <div>
        <h3 className="text-lg font-medium font-headline">{dictionary.dashboard.statistics.lastSessionRecap}</h3>
        <p className="text-sm text-muted-foreground mb-4">Your results from the last quiz.</p>
        <div className="grid grid-cols-2 gap-4">
             <div className='flex justify-center items-center'>
                <ChartContainer config={chartConfig} className="h-32 w-32">
                    <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie 
                            data={chartData} 
                            dataKey="value" 
                            nameKey="name" 
                            innerRadius={35}
                            strokeWidth={2}
                            startAngle={90}
                            endAngle={-270}
                        >
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-background rounded-lg">
                    <Target className="h-5 w-5 text-primary mx-auto mb-1" />
                    <p className="text-xl font-bold">{score}%</p>
                    <p className="text-xs text-muted-foreground">Score</p>
                </div>
                 <div className="p-2 bg-background rounded-lg">
                    <Clock className="h-5 w-5 text-primary mx-auto mb-1" />
                    <p className="text-xl font-bold">{formatTime(timeTaken)}</p>
                    <p className="text-xs text-muted-foreground">Time</p>
                </div>
                 <div className="p-2 bg-background rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
                    <p className="text-xl font-bold">{correctAnswers}/{totalQuestions}</p>
                    <p className="text-xs text-muted-foreground">Correct</p>
                </div>
                 <div className="p-2 bg-background rounded-lg">
                    <Button variant="outline" className="h-full w-full flex-col">
                        <BookOpen className="h-5 w-5 mb-1" />
                        <span className="text-xs">Review</span>
                    </Button>
                </div>
            </div>
        </div>
    </div>
  );
}
