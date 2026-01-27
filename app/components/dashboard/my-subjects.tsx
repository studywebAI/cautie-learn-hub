import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MySubjectsGrid } from "./my-subjects-grid";
import type { Subject } from "@/lib/types";
import { useDictionary } from "@/contexts/app-context";
import Link from "next/link";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";

type MySubjectsProps = {
  subjects: Subject[];
};

export function MySubjects({ subjects }: MySubjectsProps) {
  const { dictionary } = useDictionary();

  return (
    <Card>
      <CardHeader>
         <div className="flex justify-between items-center">
            <div>
                <CardTitle className="font-headline">{dictionary.dashboard.mySubjects.title}</CardTitle>
                <CardDescription>
                  {dictionary.dashboard.mySubjects.description}
                </CardDescription>
            </div>
             <Button asChild variant="outline">
                <Link href="/subjects">
                    View All Subjects
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {subjects.length > 0 ? <MySubjectsGrid subjects={subjects.slice(0, 4)} /> : <p className="text-sm text-muted-foreground">You are not enrolled in any classes yet. Join a class to see your subjects here.</p>}
      </CardContent>
    </Card>
  );
}
