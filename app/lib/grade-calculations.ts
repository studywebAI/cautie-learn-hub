/**
 * Grade calculation utilities for statistics and metrics
 */

export interface GradeStats {
  average: number;
  median: number;
  mode: number | null;
  stdDev: number;
  min: number;
  max: number;
  count: number;
}

export interface GradeDistribution {
  A: number;
  B: number;
  C: number;
  D: number;
  F: number;
}

/**
 * Calculate comprehensive statistics for a set of grades
 */
export function calculateGradeStats(grades: (number | null)[]): GradeStats {
  const validGrades = grades.filter((g): g is number => g !== null && g !== undefined);

  if (validGrades.length === 0) {
    return {
      average: 0,
      median: 0,
      mode: null,
      stdDev: 0,
      min: 0,
      max: 0,
      count: 0,
    };
  }

  // Average
  const average = validGrades.reduce((a, b) => a + b, 0) / validGrades.length;

  // Median
  const sorted = [...validGrades].sort((a, b) => a - b);
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

  // Mode
  const frequency: Record<number, number> = {};
  validGrades.forEach(g => {
    frequency[g] = (frequency[g] || 0) + 1;
  });
  const maxFreq = Math.max(...Object.values(frequency));
  const mode =
    maxFreq === 1
      ? null
      : (Number(Object.keys(frequency).find(k => frequency[Number(k)] === maxFreq)) as number | null);

  // Standard deviation
  const variance =
    validGrades.reduce((sum, g) => sum + Math.pow(g - average, 2), 0) / validGrades.length;
  const stdDev = Math.sqrt(variance);

  // Min/Max
  const min = Math.min(...validGrades);
  const max = Math.max(...validGrades);

  return {
    average: Math.round(average * 100) / 100,
    median: Math.round(median * 100) / 100,
    mode,
    stdDev: Math.round(stdDev * 100) / 100,
    min,
    max,
    count: validGrades.length,
  };
}

/**
 * Get distribution of grades by letter grade
 */
export function getGradeDistribution(
  grades: (number | null)[],
  maxGrade: number = 10
): GradeDistribution {
  const distribution: GradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };

  grades.forEach(grade => {
    if (grade === null || grade === undefined) return;

    const percentage = (grade / maxGrade) * 100;

    if (percentage >= 85) distribution.A++;
    else if (percentage >= 75) distribution.B++;
    else if (percentage >= 65) distribution.C++;
    else if (percentage >= 50) distribution.D++;
    else distribution.F++;
  });

  return distribution;
}

/**
 * Calculate trend: improving, declining, or stable
 */
export function calculateTrend(
  currentGrades: (number | null)[],
  previousGrades: (number | null)[]
): 'improving' | 'declining' | 'stable' {
  const current = calculateGradeStats(currentGrades).average;
  const previous = calculateGradeStats(previousGrades).average;

  if (previous === 0) return 'stable';

  const change = ((current - previous) / previous) * 100;

  if (change > 5) return 'improving';
  if (change < -5) return 'declining';
  return 'stable';
}

/**
 * Get trend indicator symbol
 */
export function getTrendIndicator(
  currentGrades: (number | null)[],
  previousGrades: (number | null)[]
): string {
  const trend = calculateTrend(currentGrades, previousGrades);
  return trend === 'improving' ? '↑' : trend === 'declining' ? '↓' : '→';
}

/**
 * Format grades for display with consistent decimal places
 */
export function formatGrade(grade: number | null | undefined, decimals: number = 1): string {
  if (grade === null || grade === undefined) return '—';
  return grade.toFixed(decimals);
}

/**
 * Get students below threshold (for warnings)
 */
export function getStudentsBelowThreshold(
  studentGrades: Array<{ studentId: string; studentName: string; grade: number | null }>,
  threshold: number = 65
): Array<{ studentId: string; studentName: string; grade: number | null }> {
  return studentGrades.filter(
    sg => sg.grade !== null && sg.grade !== undefined && (sg.grade / 10) * 100 < threshold
  );
}

/**
 * Validate grade is within acceptable range
 */
export function isValidGrade(grade: number, maxGrade: number = 10): boolean {
  return !isNaN(grade) && grade >= 0 && grade <= maxGrade;
}

/**
 * Round grade to step (e.g., 0.5 for half-point increments)
 */
export function roundGradeToStep(grade: number, step: number = 0.5): number {
  return Math.round(grade / step) * step;
}
