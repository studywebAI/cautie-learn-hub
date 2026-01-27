
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Deadline } from "@/lib/types";
import { useDictionary } from "@/contexts/app-context";
import { Button } from "../ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppContext, AppContextType } from "@/contexts/app-context";
import { useContext } from "react";
import { format, differenceInDays, parseISO, isFuture, isPast } from "date-fns";

const statusColors = {
  "on-track": "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700/60",
  risk: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700/60",
  behind: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700/60",
};

export function UpcomingDeadlines() {
  const { dictionary } = useDictionary();
  const { assignments, classes, role } = useContext(AppContext) as AppContextType;

  // This component is only for students for now.
  if (role !== 'student') {
    return null;
  }
  
  // Combine AI-generated deadlines with real assignments
  const allDeadlines: Deadline[] = (assignments || [])
      .filter(a => a.due_date && isFuture(parseISO(a.due_date)))
      .map(assignment => {
      const className = classes.find(c => c.id === assignment.class_id)?.name || 'Class';
      const dueDate = parseISO(assignment.due_date!);
      const daysUntilDue = differenceInDays(dueDate, new Date());
      let status: "on-track" | "risk" | "behind" = "on-track";
      if (isPast(dueDate)) status = "behind";
      else if (daysUntilDue <= 3) status = "risk";

      return {
        id: assignment.id,
        subject: className,
        title: assignment.title,
        date: format(dueDate, 'MMMM d'),
        workload: daysUntilDue >= 0 ? `Due in ${daysUntilDue} days` : `Overdue`,
        status: status,
        material_id: assignment.material_id,
        class_id: assignment.class_id,
      } as Deadline
    });

  // Sort deadlines by date
  const sortedDeadlines = allDeadlines.sort((a, b) => {
    const dateA = new Date(a.date + `, ${new Date().getFullYear()}`);
    const dateB = new Date(b.date + `, ${new Date().getFullYear()}`);
    return dateA.getTime() - dateB.getTime();
  });


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{dictionary.dashboard.upcomingDeadlines.title}</CardTitle>
        <CardDescription>
          {dictionary.dashboard.upcomingDeadlines.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedDeadlines.length === 0 ? (
           <p className="text-sm text-muted-foreground text-center py-4">No upcoming deadlines.</p>
        ) : (
          sortedDeadlines.slice(0,3).map((deadline) => {
            const href = deadline.material_id ? `/material/${deadline.material_id}` : `/class/${deadline.class_id}`;
            return (
              <Link key={deadline.id} href={href} className="block group">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group-hover:bg-muted transition-colors">
                  <div className="flex flex-col gap-0.5">
                      <p className="font-semibold">{deadline.title}</p>
                      <p className="text-sm text-muted-foreground">{deadline.subject} - {dictionary.dashboard.upcomingDeadlines.due} {deadline.date}</p>
                      <p className="text-xs text-muted-foreground">{deadline.workload}</p>
                  </div>
                  <Badge variant="outline" className={`${statusColors[deadline.status]}`}>
                      {deadline.status === "on-track" && dictionary.dashboard.upcomingDeadlines.onTrack}
                      {deadline.status === "risk" && dictionary.dashboard.upcomingDeadlines.risk}
                      {deadline.status === "behind" && dictionary.dashboard.upcomingDeadlines.behind}
                  </Badge>
                </div>
              </Link>
           )})
        )}
      </CardContent>
       <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href="/agenda">
            {dictionary.dashboard.upcomingDeadlines.viewAgenda}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
