
'use client';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Subject } from "@/lib/types";
import Link from "next/link";
import { ArrowRight, Landmark, Calculator, FlaskConical, BookOpen, Palette, Globe, Languages } from "lucide-react";
import { cn } from "@/lib/utils";


const subjectIcons: Record<string, React.ElementType> = {
  History: Landmark,
  Math: Calculator,
  Science: FlaskConical,
  Literature: BookOpen,
  Art: Palette,
  Geography: Globe,
  Dutch: Languages,
  Default: BookOpen,
};

const subjectColors: Record<string, string> = {
    History: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
    Math: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    Science: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    Literature: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    Art: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
    Geography: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400",
    Dutch: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
    Default: "bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400",
}


type MySubjectsGridProps = {
  subjects: Subject[];
};

export function MySubjectsGrid({ subjects }: MySubjectsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {subjects.map((subject) => {
            const Icon = subjectIcons[subject.name] || subjectIcons.Default;
            const colorClass = subjectColors[subject.name] || subjectColors.Default;

            return (
              <Link key={subject.id} href={`/subjects/${subject.id}`} className="group">
                <Card className="h-full transition-all duration-200 group-hover:border-primary group-hover:shadow-lg flex flex-col">
                  <CardHeader className="p-4 flex-grow-0">
                     <div className={cn("w-16 h-16 rounded-lg flex items-center justify-center mb-4", colorClass)}>
                        <Icon className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-lg">{subject.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex-grow">
                    <div className="flex items-center gap-2">
                      <Progress value={subject.progress} className="h-2" />
                      <span className="text-sm font-medium text-muted-foreground">
                        {subject.progress}%
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex justify-end items-center gap-1">
                    <span>View Subject</span>
                    <ArrowRight className="h-4 w-4" />
                  </CardFooter>
                </Card>
              </Link>
            )
        })}
    </div>
  );
}
