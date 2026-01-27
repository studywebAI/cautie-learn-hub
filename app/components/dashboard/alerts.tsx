import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert as AlertUI, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Alert } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { useDictionary } from "@/contexts/app-context";

const variantClasses = {
  destructive: "border-red-500/50 text-red-500 dark:text-red-400 [&>svg]:text-red-500 dark:[&>svg]:text-red-400",
  warning: "border-orange-500/50 text-orange-500 dark:text-orange-400 [&>svg]:text-orange-500 dark:[&>svg]:text-orange-400",
  info: "border-blue-500/50 text-blue-500 dark:text-blue-400 [&>svg]:text-blue-500 dark:[&>svg]:text-blue-400",
  success: "border-green-500/50 text-green-600 dark:text-green-400 [&>svg]:text-green-600 dark:[&>svg]:text-green-400",
};

const iconMap = {
    AlertTriangle,
    Info,
    CheckCircle2
}

type AlertsProps = {
    alerts: Alert[];
}

export function Alerts({ alerts }: AlertsProps) {
  const { dictionary } = useDictionary();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{dictionary.dashboard.alerts.title}</CardTitle>
        <CardDescription>{dictionary.dashboard.alerts.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.length > 0 ? alerts.map((alert) => {
            const Icon = iconMap[alert.icon] || AlertTriangle;
            return (
              <AlertUI key={alert.id} className={cn(variantClasses[alert.variant])}>
                <Icon className="h-4 w-4" />
                <AlertTitle className="font-semibold">{alert.title}</AlertTitle>
                <AlertDescription>{alert.description}</AlertDescription>
              </AlertUI>
            );
        }) : (
          <p className="text-sm text-muted-foreground text-center py-4">No important alerts right now.</p>
        )}
      </CardContent>
    </Card>
  );
}
