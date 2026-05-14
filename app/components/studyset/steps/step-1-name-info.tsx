'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function Step1NameInfo({
  data,
  setData,
}: {
  data: any;
  setData: (data: any) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>What's your topic?</CardTitle>
        <CardDescription>Start by giving your study set a name</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">
            Study Set Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g., Advanced Biology - Photosynthesis"
            value={data.name}
            onChange={e => setData({ ...data, name: e.target.value })}
            className="text-base"
          />
          <p className="text-xs text-muted-foreground">
            This will be the title of your study set
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject (optional)</Label>
          <Input
            id="subject"
            placeholder="e.g., Biology, Mathematics, History"
            value={data.subject}
            onChange={e => setData({ ...data, subject: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Helps organize and categorize your study sets
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            placeholder="Add any notes, goals, or context for this study set..."
            value={data.description}
            onChange={e => setData({ ...data, description: e.target.value })}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            What are you studying this for? Exams, projects, personal learning?
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>Tip:</strong> Description and subject are optional - you can skip them and add them later. Only the name is required.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
