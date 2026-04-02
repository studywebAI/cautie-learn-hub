import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SourceAnalysis } from '@/lib/presentation/types';

type SourceAnalysisCardProps = {
  analysis: SourceAnalysis;
};

export function SourceAnalysisCard({ analysis }: SourceAnalysisCardProps) {
  return (
    <Card className="border border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Source analysis ready</CardTitle>
        <CardDescription>Adaptive settings are now tuned to your source material.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Type: {analysis.dominantArchetype.replace(/_/g, ' ')}</Badge>
          <Badge variant="outline">Audience: {analysis.audienceGuess || 'general'}</Badge>
          <Badge variant="outline">
            Slides: {analysis.recommendedSlideCountMin}-{analysis.recommendedSlideCountMax}
          </Badge>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          {analysis.reasons.map((reason) => (
            <p key={reason}>- {reason}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
