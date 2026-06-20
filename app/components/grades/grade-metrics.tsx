'use client';

import { useState, useEffect, useMemo, useContext } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { calculateGradeStats, getGradeDistribution } from '@/lib/grade-calculations';

type GradeSetMetrics = {
  id: string;
  title: string;
  weight?: number;
  grades: number[];
  stats: ReturnType<typeof calculateGradeStats>;
  distribution: ReturnType<typeof getGradeDistribution>;
};

type GradeMetricsProps = {
  classId: string;
  selectedGradeSets: string[];
  onExport?: () => void;
};

const COLORS = ['#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#6b7280', '#ec4899', '#14b8a6', '#f97316'];

export default function GradeMetrics({ classId, selectedGradeSets }: GradeMetricsProps) {
  const context = useContext(AppContext) as AppContextType;
  const isDutch = context?.language === 'nl';

  const [metricsData, setMetricsData] = useState<GradeSetMetrics[]>([]);
  const [loading, setLoading] = useState(false);

  // Load metrics for selected grade sets
  useEffect(() => {
    if (!classId || selectedGradeSets.length === 0) {
      setMetricsData([]);
      return;
    }

    const loadMetrics = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/classes/${classId}/grades`);
        if (!res.ok) {
          setMetricsData([]);
          return;
        }

        const data = await res.json();
        const gradeSets = (data.grade_sets || []) as any[];

        const metrics: GradeSetMetrics[] = selectedGradeSets
          .map(gsetId => {
            const gset = gradeSets.find(g => g.id === gsetId);
            if (!gset) return null;

            const grades = (gset.student_grades || [])
              .map((sg: any) => sg.grade_numeric)
              .filter((g: any) => g !== null && g !== undefined) as number[];

            if (grades.length === 0) return null;

            return {
              id: gset.id,
              title: gset.title,
              weight: gset.weight,
              grades,
              stats: calculateGradeStats(grades),
              distribution: getGradeDistribution(grades),
            };
          })
          .filter((m): m is GradeSetMetrics => m !== null);

        setMetricsData(metrics);
      } catch (err) {
        console.error('Error loading metrics:', err);
        setMetricsData([]);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [classId, selectedGradeSets]);

  // Prepare data for comparison curve
  const curveData = useMemo(() => {
    if (metricsData.length === 0) return [];

    return metricsData.map(m => ({
      name: m.title,
      average: m.stats.average,
      median: m.stats.median,
      min: m.stats.min,
      max: m.stats.max,
    }));
  }, [metricsData]);

  // Prepare distribution data
  const distributionData = useMemo(() => {
    return metricsData.map(m => ({
      name: m.title,
      A: m.distribution.A,
      B: m.distribution.B,
      C: m.distribution.C,
      D: m.distribution.D,
      F: m.distribution.F,
    }));
  }, [metricsData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-80 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (metricsData.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground rounded-lg border border-border">
        <p>{isDutch ? 'Geen data beschikbaar' : 'No data available'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Average Grade Curve */}
      {metricsData.length > 0 && (
        <Card className="p-4">
          <h3 className="text-[15px] mb-4">
            {isDutch ? 'Gemiddelde Cijfers Vergelijking' : 'Average Grade Comparison'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={curveData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={value => (value as number).toFixed(1)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="average"
                stroke="#7f8962"
                strokeWidth={2}
                dot={{ fill: '#7f8962', r: 4 }}
                activeDot={{ r: 6 }}
                name={isDutch ? 'Gemiddelde' : 'Average'}
              />
              <Line
                type="monotone"
                dataKey="median"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 4 }}
                activeDot={{ r: 6 }}
                name={isDutch ? 'Mediaan' : 'Median'}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Grade Distribution */}
      {metricsData.length > 0 && (
        <Card className="p-4">
          <h3 className="text-[15px] mb-4">
            {isDutch ? 'Cijferverdeling' : 'Grade Distribution'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distributionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="A" stackId="a" fill="#10b981" name="A (85%+)" />
              <Bar dataKey="B" stackId="a" fill="#8b5cf6" name="B (75%+)" />
              <Bar dataKey="C" stackId="a" fill="#f59e0b" name="C (65%+)" />
              <Bar dataKey="D" stackId="a" fill="#ef4444" name="D (50%+)" />
              <Bar dataKey="F" stackId="a" fill="#6b7280" name="F (<50%)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Statistics Table */}
      <div className="space-y-2">
        <h3 className="text-[15px]">
          {isDutch ? 'Statistieken' : 'Statistics'}
        </h3>
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="text-left p-3 text-[13px] text-muted-foreground">
                  {isDutch ? 'Cijferlijst' : 'Grade Set'}
                </th>
                <th className="text-center p-3 text-[13px] text-muted-foreground">
                  {isDutch ? 'Gemiddelde' : 'Average'}
                </th>
                <th className="text-center p-3 text-[13px] text-muted-foreground">
                  {isDutch ? 'Mediaan' : 'Median'}
                </th>
                <th className="text-center p-3 text-[13px] text-muted-foreground">
                  {isDutch ? 'Std Dev' : 'Std Dev'}
                </th>
                <th className="text-center p-3 text-[13px] text-muted-foreground">
                  {isDutch ? 'Min-Max' : 'Min-Max'}
                </th>
                <th className="text-center p-3 text-[13px] text-muted-foreground">
                  {isDutch ? 'Aantal' : 'Count'}
                </th>
              </tr>
            </thead>
            <tbody>
              {metricsData.map(m => (
                <tr key={m.id} className="border-b border-border hover:bg-muted/30">
                  <td className="p-3 font-medium">{m.title}</td>
                  <td className="text-center p-3">{m.stats.average.toFixed(1)}</td>
                  <td className="text-center p-3">{m.stats.median.toFixed(1)}</td>
                  <td className="text-center p-3">{m.stats.stdDev.toFixed(2)}</td>
                  <td className="text-center p-3">
                    {m.stats.min.toFixed(1)} – {m.stats.max.toFixed(1)}
                  </td>
                  <td className="text-center p-3">{m.stats.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
