'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, CheckCircle, AlertTriangle, Lightbulb, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AIGradingResult {
  overall_score: number;
  breakdown: Array<{
    criterion: string;
    score: number;
    reasoning: string;
    feedback: string;
    strengths: string[];
    improvements: string[];
  }>;
  general_feedback: string;
  grade_letter: string;
  confidence_level: 'high' | 'medium' | 'low';
  recommendations: string[];
  flagged_issues?: string[];
}

interface AIGradingAssistantProps {
  submissionId: string;
  onGradingComplete?: (result: AIGradingResult) => void;
  className?: string;
}

export function AIGradingAssistant({ submissionId, onGradingComplete, className }: AIGradingAssistantProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AIGradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const analyzeSubmission = async () => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ai/grade-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submissionId,
          use_ai_assistance: true,
          teacher_override: false, // Don't auto-apply, just show analysis
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze submission');
      }

      const data = await response.json();
      setResult(data.ai_analysis);

      if (onGradingComplete) {
        onGradingComplete(data.ai_analysis);
      }

      toast({
        title: 'Analysis Complete',
        description: 'AI grading analysis has been generated.',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast({
        title: 'Analysis Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyGrading = async () => {
    if (!result) return;

    try {
      const response = await fetch('/api/ai/grade-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submissionId,
          use_ai_assistance: true,
          teacher_override: false, // This will apply the AI grading
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to apply grading');
      }

      toast({
        title: 'Grading Applied',
        description: 'AI-assisted grading has been applied to the submission.',
      });
    } catch (err) {
      toast({
        title: 'Failed to Apply Grading',
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Brain className="mr-2 h-5 w-5" />
          AI Grading Assistant
        </CardTitle>
        <CardDescription>
          Get intelligent analysis and grading suggestions for this submission
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result && !isAnalyzing && (
          <div className="text-center py-6">
            <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Use AI to analyze this submission and get detailed grading recommendations.
            </p>
            <Button onClick={analyzeSubmission} disabled={isAnalyzing}>
              <Brain className="mr-2 h-4 w-4" />
              Analyze with AI
            </Button>
          </div>
        )}

        {isAnalyzing && (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Analyzing submission with AI...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {result.overall_score}/100
              </div>
              <Badge className={getConfidenceColor(result.confidence_level)}>
                {result.confidence_level.toUpperCase()} CONFIDENCE
              </Badge>
              <div className="text-sm text-muted-foreground mt-2">
                Grade: {result.grade_letter}
              </div>
            </div>

            {/* General Feedback */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Overall Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{result.general_feedback}</p>
              </CardContent>
            </Card>

            {/* Detailed Breakdown */}
            <div>
              <h4 className="text-lg font-semibold mb-3 flex items-center">
                <Target className="mr-2 h-4 w-4" />
                Criteria Breakdown
              </h4>
              <div className="space-y-4">
                {result.breakdown.map((item, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{item.criterion}</CardTitle>
                        <Badge variant="outline">{item.score}/100</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1">Reasoning:</p>
                        <p className="text-sm text-muted-foreground">{item.reasoning}</p>
                      </div>

                      {item.strengths.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1 text-green-700">Strengths:</p>
                          <ul className="text-sm text-green-600 list-disc list-inside">
                            {item.strengths.map((strength, i) => (
                              <li key={i}>{strength}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {item.improvements.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-1 text-orange-700">Areas for Improvement:</p>
                          <ul className="text-sm text-orange-600 list-disc list-inside">
                            {item.improvements.map((improvement, i) => (
                              <li key={i}>{improvement}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-medium mb-1">Specific Feedback:</p>
                        <p className="text-sm text-muted-foreground">{item.feedback}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1">
                    {result.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-primary mr-2">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Flagged Issues */}
            {result.flagged_issues && result.flagged_issues.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Issues flagged for review:</strong>
                  <ul className="mt-2 list-disc list-inside">
                    {result.flagged_issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button onClick={applyGrading} className="flex-1">
                <CheckCircle className="mr-2 h-4 w-4" />
                Apply AI Grading
              </Button>
              <Button variant="outline" onClick={analyzeSubmission}>
                <Brain className="mr-2 h-4 w-4" />
                Re-analyze
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}