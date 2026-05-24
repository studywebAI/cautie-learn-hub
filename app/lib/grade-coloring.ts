/**
 * Grade coloring utilities for visual grade display
 * Converts numeric grades to letter grades with colors
 */

export interface BenchmarkScale {
  A: { min: number; color: string; bgColor: string };
  B: { min: number; color: string; bgColor: string };
  C: { min: number; color: string; bgColor: string };
  D: { min: number; color: string; bgColor: string };
  F: { min: number; color: string; bgColor: string };
}

const DEFAULT_BENCHMARK: BenchmarkScale = {
  A: { min: 85, color: '#10b981', bgColor: '#ecfdf5' },
  B: { min: 75, color: '#8b5cf6', bgColor: '#f5f3ff' },
  C: { min: 65, color: '#f59e0b', bgColor: '#fffbeb' },
  D: { min: 50, color: '#ef4444', bgColor: '#fef2f2' },
  F: { min: 0, color: '#6b7280', bgColor: '#f9fafb' },
};

export function getLetterGrade(
  grade: number,
  maxGrade: number = 10,
  benchmark: BenchmarkScale = DEFAULT_BENCHMARK
): string {
  const percentage = (grade / maxGrade) * 100;

  if (percentage >= benchmark.A.min) return 'A';
  if (percentage >= benchmark.B.min) return 'B';
  if (percentage >= benchmark.C.min) return 'C';
  if (percentage >= benchmark.D.min) return 'D';
  return 'F';
}

export function getGradeColor(
  grade: number | null | undefined,
  maxGrade: number = 10,
  benchmark: BenchmarkScale = DEFAULT_BENCHMARK
): {
  color: string;
  bgColor: string;
  letterGrade: string;
} {
  if (grade === null || grade === undefined || grade < 0) {
    return {
      color: '#6b7280',
      bgColor: '#f9fafb',
      letterGrade: '—',
    };
  }

  const letterGrade = getLetterGrade(grade, maxGrade, benchmark);
  const benchmarkKey = letterGrade as keyof BenchmarkScale;

  return {
    color: benchmark[benchmarkKey].color,
    bgColor: benchmark[benchmarkKey].bgColor,
    letterGrade,
  };
}

export function getGradeStyleClasses(
  grade: number | null | undefined,
  maxGrade: number = 10
): string {
  const { letterGrade } = getGradeColor(grade, maxGrade);

  const colorMap: Record<string, string> = {
    A: 'text-green-600',
    B: 'text-purple-600',
    C: 'text-amber-600',
    D: 'text-red-600',
    F: 'text-gray-600',
    '—': 'text-gray-400',
  };

  return colorMap[letterGrade] || 'text-gray-600';
}

export function getGradeBgClasses(
  grade: number | null | undefined,
  maxGrade: number = 10
): string {
  const { letterGrade } = getGradeColor(grade, maxGrade);

  const bgMap: Record<string, string> = {
    A: 'bg-green-50',
    B: 'bg-purple-50',
    C: 'bg-amber-50',
    D: 'bg-red-50',
    F: 'bg-gray-50',
    '—': 'bg-white',
  };

  return bgMap[letterGrade] || 'bg-white';
}

/**
 * Get all grades with their colors and letter grades
 */
export function colorizeGrades(
  grades: (number | null)[],
  maxGrade: number = 10
): Array<{
  grade: number | null;
  letterGrade: string;
  color: string;
  bgColor: string;
}> {
  return grades.map(grade => {
    const colorInfo = getGradeColor(grade, maxGrade);
    return {
      grade,
      ...colorInfo,
    };
  });
}
