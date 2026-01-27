import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { QuickAccessItem } from "@/lib/types";
import Link from "next/link";
import { Notebook, File, BrainCircuit, FileText } from "lucide-react";
import { useDictionary } from "@/contexts/app-context";

const iconMap = {
  Notebook,
  File,
  BrainCircuit,
  FileText,
};

type QuickAccessProps = {
  quickAccessItems: QuickAccessItem[];
};

export function QuickAccess({ quickAccessItems }: QuickAccessProps) {
  const { dictionary } = useDictionary();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">{dictionary.dashboard.quickAccess.title}</CardTitle>
        <CardDescription>{dictionary.dashboard.quickAccess.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {quickAccessItems.length > 0 ? quickAccessItems.map((item) => {
          const Icon = iconMap[item.icon] || File;
          return (
            <Link key={item.id} href="#">
              <div className="group flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg aspect-square text-center transition-colors hover:bg-muted">
                <Icon className="h-8 w-8 mb-2 text-primary transition-transform group-hover:scale-110" />
                <p className="text-sm font-medium leading-tight">
                  {item.title}
                </p>
              </div>
            </Link>
          );
        }) : (
          <p className="text-sm text-muted-foreground text-center col-span-2 py-8">No recent items.</p>
        )}
      </CardContent>
    </Card>
  );
}
