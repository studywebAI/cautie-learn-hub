'use client';

import React, { useState } from 'react';
import { BlockProps, ComplexBlockContent } from './types';
import { cn } from '@/lib/utils';
import { ProfessionalMindmapRenderer } from '@/components/material-viewers/mindmap-professional';
import { ProfessionalTimelineRenderer } from '@/components/material-viewers/timeline-professional';

interface ComplexBlockProps extends BlockProps {
  block: BlockProps['block'] & { content: ComplexBlockContent };
}

export const ComplexBlock: React.FC<ComplexBlockProps> = ({
  block,
  onUpdate,
  isEditing = false,
  className,
}) => {
  const [isEditingState, setIsEditingState] = useState(isEditing);

  const renderViewer = () => {
    const { viewerType, data } = block.data;

    switch (viewerType) {
      case 'mindmap-professional':
        return (
          <ProfessionalMindmapRenderer
            data={data || { central: 'Central', branches: [] }}
          />
        );
      case 'timeline-professional':
        return (
          <ProfessionalTimelineRenderer
            data={data || { events: [] }}
          />
        );
      case 'chart':
        // Render a simple SVG chart based on data
        return <ChartBlock data={data} />;
      default:
        // Render raw JSON data in a structured way for unknown types
        return (
          <div className="p-4 rounded-lg border bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">
              {viewerType} viewer
            </p>
            {data && (
              <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-[300px]">
                {JSON.stringify(data, null, 2)}
              </pre>
            )}
          </div>
        );
    }
  };

  return (
    <div className={cn('w-full mb-4', className)}>
      <div className="border rounded-lg p-4 bg-background">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground capitalize">
            {block.data.type || block.data.viewerType} Viewer
          </span>
          <button
            onClick={() => setIsEditingState(!isEditingState)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {isEditingState ? 'Done' : 'Edit'}
          </button>
        </div>
        <div className="min-h-[200px]">
          {renderViewer()}
        </div>
        {isEditingState && (
          <div className="mt-4 p-4 border-t bg-muted/50 rounded">
            <p className="text-sm text-muted-foreground">
              Complex blocks are edited through their respective viewer interfaces.
              Click "Done" when finished.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

function ChartBlock({ data }: { data: any }) {
  if (!data) return <div className="p-4 text-sm text-muted-foreground">No chart data</div>;

  const chartType = data.chartType || 'bar';
  const labels: string[] = data.data?.labels || data.labels || [];
  const values: number[] = data.data?.values || data.values || [];

  if (labels.length === 0 || values.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">Empty chart data</div>;
  }

  const maxValue = Math.max(...values);
  const colors = ['hsl(var(--primary))', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  if (chartType === 'bar') {
    const barWidth = 40;
    const spacing = 60;
    const startX = 50;
    const bottomY = 250;

    return (
      <svg width={Math.max(400, startX + labels.length * spacing + 20)} height="300" className="border rounded">
        {labels.map((label, index) => {
          const x = startX + index * spacing;
          const height = (values[index] / maxValue) * 180;
          const y = bottomY - height;
          return (
            <g key={index}>
              <rect x={x} y={y} width={barWidth} height={height} fill={colors[index % colors.length]} rx="2" />
              <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" fontSize="11" fontWeight="500">
                {values[index]}
              </text>
              <text x={x + barWidth / 2} y={bottomY + 18} textAnchor="middle" fontSize="10" fill="#6b7280">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  if (chartType === 'pie') {
    const total = values.reduce((sum, v) => sum + v, 0);
    const cx = 150;
    const cy = 150;
    const r = 100;
    let cumulativeAngle = -Math.PI / 2;

    return (
      <svg width="400" height="300" className="border rounded">
        {values.map((value, index) => {
          const sliceAngle = (value / total) * 2 * Math.PI;
          const startAngle = cumulativeAngle;
          const endAngle = cumulativeAngle + sliceAngle;
          cumulativeAngle = endAngle;

          const x1 = cx + r * Math.cos(startAngle);
          const y1 = cy + r * Math.sin(startAngle);
          const x2 = cx + r * Math.cos(endAngle);
          const y2 = cy + r * Math.sin(endAngle);
          const largeArc = sliceAngle > Math.PI ? 1 : 0;

          const midAngle = startAngle + sliceAngle / 2;
          const labelX = cx + (r + 25) * Math.cos(midAngle);
          const labelY = cy + (r + 25) * Math.sin(midAngle);

          return (
            <g key={index}>
              <path
                d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={colors[index % colors.length]}
                stroke="white"
                strokeWidth="2"
              />
              <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fontSize="10">
                {labels[index]} ({Math.round((value / total) * 100)}%)
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  return <div className="p-4 text-sm text-muted-foreground">Unsupported chart type: {chartType}</div>;
}
