'use client';
import React from 'react';
import { marked } from 'marked';
import { Card, CardContent } from '@/components/ui/card';
import { ProfessionalMindmapRenderer } from './mindmap-professional';
import { ProfessionalTimelineRenderer } from './timeline-professional';

type NoteSection = {
  title: string;
  content: string | string[];
};

type NoteViewerProps = {
  notes: NoteSection[];
};

type MindmapData = {
  type: 'mindmap';
  central: string;
  branches: Array<{
    topic: string;
    subs?: string[];
  }>;
};

type FlowchartData = {
  type: 'flowchart';
  nodes: Array<{
    id: string;
    label: string;
    type: 'start' | 'process' | 'decision' | 'end';
  }>;
  connections: Array<{
    from: string;
    to: string;
    label?: string;
  }>;
};

type TimelineData = {
  type: 'timeline';
  events: Array<{
    date: string;
    title: string;
    description: string;
  }>;
};

type ChartData = {
  type: 'chart';
  chartType: 'bar' | 'pie';
  data: {
    labels: string[];
    values: number[];
  };
};

type VennDiagramData = {
  type: 'venndiagram';
  sets: Array<{
    label: string;
    items: string[];
  }>;
};

type ConceptMapData = {
  type: 'conceptmap';
  nodes: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
  }>;
  connections: Array<{
    from: string;
    to: string;
    label?: string;
  }>;
};

type FishboneData = {
  type: 'fishbone';
  problem: string;
  categories: Array<{
    name: string;
    causes: string[];
  }>;
};

type DecisionTreeData = {
  type: 'decisiontree';
  root: {
    question: string;
    yes?: any;
    no?: any;
    outcome?: string;
  };
};

type SWOTData = {
  type: 'swot';
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
};

type PESTELData = {
  type: 'pestel';
  political: string[];
  economic: string[];
  social: string[];
  technological: string[];
  environmental: string[];
  legal: string[];
};

type KanbanData = {
  type: 'kanban';
  columns: Array<{
    name: string;
    cards: string[];
  }>;
};

type VocabularyListData = {
  type: 'vocabulary';
  words: Array<{
    term: string;
    definition: string;
    partOfSpeech?: string;
    example?: string;
  }>;
};

type PieChartData = {
  type: 'piechart';
  data: {
    labels: string[];
    values: number[];
    colors?: string[];
  };
};

function MindmapRenderer({ data, title }: { data: MindmapData; title?: string }) {
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  // Use full viewport dimensions for maximum space utilization
  // Calculate dimensions to fit without scrolling, accounting for sidebar (~280px)
  const sidebarWidth = 280;
  const availableWidth = typeof window !== 'undefined' ? Math.min(window.innerWidth - sidebarWidth - 80, 1000) : 1000;
  const availableHeight = typeof window !== 'undefined' ? Math.min(window.innerHeight - 200, 700) : 700;
  const svgWidth = Math.min(availableWidth, availableHeight * 1.4); // Maintain aspect ratio
  const svgHeight = Math.min(availableHeight, svgWidth / 1.4);
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

  // Better sizing calculations
  // Use title as central node, fallback to data.central
  const centralText = title || data.central;

  const centralRadius = Math.max(50, Math.min(70, centralText.length * 1.5));
  const branchDistance = Math.max(200, centralRadius * 3);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(5, prev * zoomFactor)));
  };

  // Touch support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      e.preventDefault();
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const wrapText = (text: string, maxWidth: number, fontSize: number) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const testWidth = testLine.length * (fontSize * 0.6);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines;
  };

  return (
    <div
      className="relative w-full h-full border rounded overflow-hidden bg-gray-50"

    >
      <svg
        width={svgWidth}
        height={svgHeight}
        className="cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center',
          touchAction: 'none'
        }}
      >
        {/* Central node */}
        <circle cx={centerX} cy={centerY} r={centralRadius} fill="#3b82f6" stroke="#1e40af" strokeWidth="2" />
        <text x={centerX} y={centerY} textAnchor="middle" dy="0.35em" fill="white" fontSize="14" fontWeight="bold">
          {wrapText(centralText, centralRadius * 1.8, 14).map((line, i) => (
            <tspan key={i} x={centerX} dy={i === 0 ? 0 : '1.3em'}>{line}</tspan>
          ))}
        </text>

        {/* Branch nodes */}
        {data.branches.map((branch, index) => {
          const angle = (index / Math.max(data.branches.length, 3)) * 2 * Math.PI - Math.PI / 2;
          const branchRadius = Math.max(40, Math.min(55, branch.topic.length * 1.2));
          const x = centerX + Math.cos(angle) * branchDistance;
          const y = centerY + Math.sin(angle) * branchDistance;

          return (
            <g key={index}>
              {/* Line from center to branch - starts from central circle edge */}
              <line
                x1={centerX + Math.cos(angle) * centralRadius}
                y1={centerY + Math.sin(angle) * centralRadius}
                x2={x - Math.cos(angle) * branchRadius}
                y2={y - Math.sin(angle) * branchRadius}
                stroke="#6b7280"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Branch circle */}
              <circle cx={x} cy={y} r={branchRadius} fill="#10b981" stroke="#047857" strokeWidth="2" />
              <text x={x} y={y} textAnchor="middle" dy="0.35em" fill="white" fontSize="11" fontWeight="bold">
                {wrapText(branch.topic, branchRadius * 1.6, 11).map((line, i) => (
                  <tspan key={i} x={x} dy={i === 0 ? 0 : '1.2em'}>{line}</tspan>
                ))}
              </text>

              {/* Sub-branches */}
              {branch.subs?.map((sub, subIndex) => {
                const subAngle = angle + (subIndex - (branch.subs!.length - 1) / 2) * 0.8;
                const subDistance = Math.max(120, branchRadius * 2.5);
                const subRadius = Math.max(25, Math.min(35, sub.length * 1.0));
                const subX = x + Math.cos(subAngle) * subDistance;
                const subY = y + Math.sin(subAngle) * subDistance;

                return (
                  <g key={subIndex}>
                    {/* Line from branch to sub - starts from branch circle edge */}
                    <line
                      x1={x + Math.cos(subAngle) * branchRadius}
                      y1={y + Math.sin(subAngle) * branchRadius}
                      x2={subX - Math.cos(subAngle) * subRadius}
                      y2={subY - Math.sin(subAngle) * subRadius}
                      stroke="#9ca3af"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />

                    {/* Sub circle */}
                    <circle cx={subX} cy={subY} r={subRadius} fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
                    <text x={subX} y={subY} textAnchor="middle" dy="0.35em" fill="white" fontSize="9" fontWeight="bold">
                      {wrapText(sub, subRadius * 1.8, 9).map((line, i) => (
                        <tspan key={i} x={subX} dy={i === 0 ? 0 : '1.1em'}>{line}</tspan>
                      ))}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function FlowchartRenderer({ data }: { data: FlowchartData }) {
  const nodeSpacing = 120;
  const startY = 50;

  return (
    <svg width="600" height={data.nodes.length * nodeSpacing + 100} className="border rounded">
      {data.nodes.map((node, index) => {
        const y = startY + index * nodeSpacing;
        const x = 300;
        let fillColor = '#e5e7eb';
        let shape = null;

        switch (node.type) {
          case 'start':
          case 'end':
            shape = <ellipse cx={x} cy={y} rx="60" ry="30" fill={fillColor} stroke="#374151" />;
            break;
          case 'decision':
            shape = <polygon points={`${x-40},${y} ${x},${y-40} ${x+40},${y} ${x},${y+40}`} fill={fillColor} stroke="#374151" />;
            break;
          default:
            shape = <rect x={x-60} y={y-20} width="120" height="40" fill={fillColor} stroke="#374151" rx="5" />;
        }

        return (
          <g key={node.id}>
            {shape}
            <text x={x} y={y} textAnchor="middle" dy="0.35em" fontSize="12" fontWeight="bold">
              {node.label}
            </text>
          </g>
        );
      })}

      {/* Connections */}
      {data.connections.map((conn, index) => {
        const fromIndex = data.nodes.findIndex(n => n.id === conn.from);
        const toIndex = data.nodes.findIndex(n => n.id === conn.to);
        const fromY = startY + fromIndex * nodeSpacing;
        const toY = startY + toIndex * nodeSpacing;

        return (
          <g key={index}>
            <line x1="300" y1={fromY + 20} x2="300" y2={toY - 20} stroke="#374151" strokeWidth="2" markerEnd="url(#arrowhead)" />
            {conn.label && (
              <text x="320" y={(fromY + toY) / 2} fontSize="10" fill="#6b7280">
                {conn.label}
              </text>
            )}
          </g>
        );
      })}

      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#374151" />
        </marker>
      </defs>
    </svg>
  );
}

function TimelineRenderer({ data }: { data: TimelineData }) {
  const startX = 50;
  const endX = 550;
  const lineY = 100;

  return (
    <svg width="600" height="300" className="border rounded">
      {/* Timeline line */}
      <line x1={startX} y1={lineY} x2={endX} y2={lineY} stroke="#374151" strokeWidth="3" />

      {data.events.map((event, index) => {
        const x = startX + (index / (data.events.length - 1 || 1)) * (endX - startX);

        return (
          <g key={index}>
            {/* Event dot */}
            <circle cx={x} cy={lineY} r="8" fill="#3b82f6" />
            <circle cx={x} cy={lineY} r="12" fill="none" stroke="#3b82f6" strokeWidth="2" />

            {/* Date */}
            <text x={x} y={lineY - 25} textAnchor="middle" fontSize="10" fill="#6b7280">
              {new Date(event.date).toLocaleDateString()}
            </text>

            {/* Title */}
            <text x={x} y={lineY + 35} textAnchor="middle" fontSize="12" fontWeight="bold">
              {event.title}
            </text>

            {/* Description */}
            <text x={x} y={lineY + 55} textAnchor="middle" fontSize="10" fill="#6b7280">
              {event.description}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ChartRenderer({ data }: { data: ChartData }) {
  if (data.chartType === 'bar') {
    const barWidth = 40;
    const spacing = 60;
    const startX = 50;
    const bottomY = 250;
    const maxValue = Math.max(...data.data.values);

    return (
      <svg width="600" height="300" className="border rounded">
        {data.data.labels.map((label, index) => {
          const x = startX + index * spacing;
          const height = (data.data.values[index] / maxValue) * 180;
          const y = bottomY - height;

          return (
            <g key={index}>
              {/* Bar */}
              <rect x={x} y={y} width={barWidth} height={height} fill="#3b82f6" />

              {/* Value label */}
              <text x={x + barWidth/2} y={y - 10} textAnchor="middle" fontSize="12" fontWeight="bold">
                {data.data.values[index]}
              </text>

              {/* X-axis label */}
              <text x={x + barWidth/2} y={bottomY + 20} textAnchor="middle" fontSize="10">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // Fallback for pie chart (simplified)
  return <div className="text-center p-4">Pie chart visualization coming soon...</div>;
}

function VennDiagramRenderer({ data }: { data: VennDiagramData }) {
  if (data.sets.length !== 2) {
    return <div className="text-center p-4">Venn diagrams with 2 sets supported only</div>;
  }

  return (
    <svg width="600" height="400" className="border rounded">
      {/* Set A */}
      <circle cx="200" cy="200" r="120" fill="#3b82f6" fillOpacity="0.3" stroke="#3b82f6" strokeWidth="2" />
      <text x="200" y="160" textAnchor="middle" fontSize="14" fontWeight="bold">Set A: {data.sets[0].label}</text>
      {data.sets[0].items.map((item, index) => (
        <text key={index} x="200" y={200 + index * 15} textAnchor="middle" fontSize="12">{item}</text>
      ))}

      {/* Set B */}
      <circle cx="400" cy="200" r="120" fill="#10b981" fillOpacity="0.3" stroke="#10b981" strokeWidth="2" />
      <text x="400" y="160" textAnchor="middle" fontSize="14" fontWeight="bold">Set B: {data.sets[1].label}</text>
      {data.sets[1].items.map((item, index) => (
        <text key={index} x="400" y={200 + index * 15} textAnchor="middle" fontSize="12">{item}</text>
      ))}

      {/* Overlap */}
      <circle cx="300" cy="200" r="80" fill="#f59e0b" fillOpacity="0.3" stroke="#f59e0b" strokeWidth="2" />
      <text x="300" y="180" textAnchor="middle" fontSize="12" fontWeight="bold">Overlap</text>
      {[...new Set(data.sets[0].items.filter(item => data.sets[1].items.includes(item)))].map((item, index) => (
        <text key={index} x="300" y={200 + index * 15} textAnchor="middle" fontSize="12">{item}</text>
      ))}
    </svg>
  );
}

function ConceptMapRenderer({ data }: { data: ConceptMapData }) {
  return (
    <svg width="600" height="400" className="border rounded">
      {data.nodes.map((node) => (
        <g key={node.id}>
          <rect x={node.x - 50} y={node.y - 20} width="100" height="40" fill="#e5e7eb" stroke="#374151" rx="5" />
          <text x={node.x} y={node.y} textAnchor="middle" dy="0.35em" fontSize="12" fontWeight="bold">
            {node.label}
          </text>
        </g>
      ))}

      {data.connections.map((conn, index) => {
        const fromNode = data.nodes.find(n => n.id === conn.from);
        const toNode = data.nodes.find(n => n.id === conn.to);
        if (!fromNode || !toNode) return null;

        return (
          <g key={index}>
            <line x1={fromNode.x} y1={fromNode.y + 20} x2={toNode.x} y2={toNode.y - 20} stroke="#374151" strokeWidth="2" markerEnd="url(#arrow)" />
            {conn.label && (
              <text x={(fromNode.x + toNode.x) / 2} y={(fromNode.y + toNode.y) / 2 - 5} textAnchor="middle" fontSize="10" fill="#6b7280">
                {conn.label}
              </text>
            )}
          </g>
        );
      })}

      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#374151" />
        </marker>
      </defs>
    </svg>
  );
}

function FishboneRenderer({ data }: { data: FishboneData }) {
  const centerX = 400;
  const centerY = 200;
  const mainBoneLength = 300;
  const categoryLength = 100;

  return (
    <svg width="800" height="400" className="border rounded">
      {/* Main spine */}
      <line x1={centerX - mainBoneLength/2} y1={centerY} x2={centerX + mainBoneLength/2} y2={centerY} stroke="#374151" strokeWidth="4" />
      <text x={centerX} y={centerY - 10} textAnchor="middle" fontSize="14" fontWeight="bold">{data.problem}</text>

      {/* Categories */}
      {data.categories.map((category, index) => {
        const isTop = index < data.categories.length / 2;
        const yOffset = (index % (data.categories.length / 2)) * 60 + 50;
        const y = isTop ? centerY - yOffset : centerY + yOffset;
        const x = isTop ? centerX - 150 : centerX + 150;

        return (
          <g key={index}>
            {/* Category bone */}
            <line x1={isTop ? centerX - 50 : centerX + 50} y1={centerY} x2={x} y2={y} stroke="#374151" strokeWidth="3" />

            {/* Category label */}
            <text x={x + (isTop ? -10 : 10)} y={y - 5} textAnchor={isTop ? "end" : "start"} fontSize="12" fontWeight="bold">
              {category.name}
            </text>

            {/* Causes */}
            {category.causes.map((cause, causeIndex) => (
              <g key={causeIndex}>
                <line x1={x} y1={y} x2={x + (isTop ? -40 : 40)} y2={y + causeIndex * 20 - (category.causes.length - 1) * 10} stroke="#6b7280" strokeWidth="2" />
                <text x={x + (isTop ? -50 : 50)} y={y + causeIndex * 20 - (category.causes.length - 1) * 10 + 3} textAnchor={isTop ? "end" : "start"} fontSize="10">
                  {cause}
                </text>
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function DecisionTreeRenderer({ data }: { data: DecisionTreeData }) {
  const renderNode = (node: any, x: number, y: number, level: number = 0): JSX.Element => {
    const spacing = 150 / (level + 1);

    return (
      <g>
        {/* Node */}
        <rect x={x - 60} y={y - 15} width="120" height="30" fill="#e5e7eb" stroke="#374151" rx="5" />
        <text x={x} y={y} textAnchor="middle" dy="0.35em" fontSize="12">
          {node.question || node.outcome}
        </text>

        {/* Branches */}
        {node.yes && (
          <>
            <line x1={x} y1={y + 15} x2={x - spacing} y2={y + 60} stroke="#374151" strokeWidth="2" />
            <text x={x - spacing/2} y={y + 35} textAnchor="middle" fontSize="10" fill="#6b7280">Yes</text>
            {renderNode(node.yes, x - spacing, y + 75, level + 1)}
          </>
        )}
        {node.no && (
          <>
            <line x1={x} y1={y + 15} x2={x + spacing} y2={y + 60} stroke="#374151" strokeWidth="2" />
            <text x={x + spacing/2} y={y + 35} textAnchor="middle" fontSize="10" fill="#6b7280">No</text>
            {renderNode(node.no, x + spacing, y + 75, level + 1)}
          </>
        )}
      </g>
    );
  };

  return (
    <svg width="600" height="300" className="border rounded">
      {renderNode(data.root, 300, 50)}
    </svg>
  );
}

function SWOTRenderer({ data }: { data: SWOTData }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="border-2 border-green-500 p-4 rounded">
        <h3 className="text-green-700 font-bold text-center mb-2">Strengths</h3>
        <ul className="list-disc list-inside">
          {data.strengths.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      </div>
      <div className="border-2 border-red-500 p-4 rounded">
        <h3 className="text-red-700 font-bold text-center mb-2">Weaknesses</h3>
        <ul className="list-disc list-inside">
          {data.weaknesses.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      </div>
      <div className="border-2 border-blue-500 p-4 rounded">
        <h3 className="text-blue-700 font-bold text-center mb-2">Opportunities</h3>
        <ul className="list-disc list-inside">
          {data.opportunities.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      </div>
      <div className="border-2 border-yellow-500 p-4 rounded">
        <h3 className="text-yellow-700 font-bold text-center mb-2">Threats</h3>
        <ul className="list-disc list-inside">
          {data.threats.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      </div>
    </div>
  );
}

function PESTELRenderer({ data }: { data: PESTELData }) {
  const categories = [
    { name: 'Political', items: data.political, color: 'blue' },
    { name: 'Economic', items: data.economic, color: 'green' },
    { name: 'Social', items: data.social, color: 'purple' },
    { name: 'Technological', items: data.technological, color: 'orange' },
    { name: 'Environmental', items: data.environmental, color: 'teal' },
    { name: 'Legal', items: data.legal, color: 'red' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {categories.map((category, index) => (
        <div key={index} className={`border-2 border-${category.color}-500 p-4 rounded`}>
          <h3 className={`text-${category.color}-700 font-bold text-center mb-2`}>{category.name}</h3>
          <ul className="list-disc list-inside">
            {category.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function KanbanRenderer({ data }: { data: KanbanData }) {
  return (
    <div className="flex gap-4 overflow-x-auto">
      {data.columns.map((column, index) => (
        <div key={index} className="min-w-64 bg-gray-100 p-4 rounded-lg">
          <h3 className="font-bold text-center mb-3">{column.name}</h3>
          <div className="space-y-2">
            {column.cards.map((card, cardIndex) => (
              <div key={cardIndex} className="bg-white p-3 rounded shadow-sm border">
                {card}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function VocabularyRenderer({ data }: { data: VocabularyListData }) {
  const colors = ['bg-blue-100', 'bg-green-100', 'bg-yellow-100', 'bg-purple-100', 'bg-pink-100', 'bg-indigo-100'];

  return (
    <div className="space-y-3">
      {data.words.map((word, index) => (
        <div key={index} className={`p-4 rounded-lg border-l-4 border-blue-500 ${colors[index % colors.length]}`}>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg text-gray-800">{word.term}</h3>
                {word.partOfSpeech && (
                  <span className="text-sm text-gray-500 italic">({word.partOfSpeech})</span>
                )}
              </div>
              <p className="text-gray-700 mb-2">{word.definition}</p>
              {word.example && (
                <p className="text-sm text-gray-600 italic">
                  Example: {word.example}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PieChartRenderer({ data }: { data: PieChartData }) {
  const total = data.data.values.reduce((sum, val) => sum + val, 0);
  let currentAngle = 0;
  const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

  return (
    <div className="flex items-center gap-6">
      <svg width="300" height="300" className="border rounded">
        {data.data.values.map((value, index) => {
          const percentage = value / total;
          const angle = percentage * 360;
          const startAngle = currentAngle;
          currentAngle += angle;
          const startAngleRad = (startAngle * Math.PI) / 180;
          const endAngleRad = (currentAngle * Math.PI) / 180;
          const x1 = 150 + 100 * Math.cos(startAngleRad);
          const y1 = 150 + 100 * Math.sin(startAngleRad);
          const x2 = 150 + 100 * Math.cos(endAngleRad);
          const y2 = 150 + 100 * Math.sin(endAngleRad);
          const largeArcFlag = percentage > 0.5 ? 1 : 0;
          const pathData = [
            `M 150 150`,
            `L ${x1} ${y1}`,
            `A 100 100 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ');

          return (
            <path
              key={index}
              d={pathData}
              fill={data.data.colors?.[index] || defaultColors[index % defaultColors.length]}
              stroke="#fff"
              strokeWidth="2"
            />
          );
        })}
      </svg>

      <div className="space-y-2">
        {data.data.labels.map((label, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: data.data.colors?.[index] || defaultColors[index % defaultColors.length] }}
            />
            <span className="text-sm">{label}: {data.data.values[index]} ({((data.data.values[index] / total) * 100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NoteViewer({ notes }: NoteViewerProps) {
  if (!notes || notes.length === 0) {
    return <p>No content available for this note.</p>;
  }

  return (
    <Card className="h-full">
        <CardContent className="p-6 h-full">
            <div className="prose dark:prose-invert max-w-none h-full">
                {notes.map((note, index) => (
                    <div key={index} className="mb-8 h-full">

                        {(() => {
                          if (typeof note.content === 'string') {
                            try {
                              const data = JSON.parse(note.content.trim());
                              if (data && typeof data === 'object' && data.type) {
                                return true;
                              }
                            } catch {
                              // Fall through
                            }
                          }
                          return false;
                        })() ? (
                          (() => {
                            try {
                              const contentStr = Array.isArray(note.content) ? note.content.join('\n') : note.content;
                              const data = JSON.parse(contentStr);
                              switch (data.type) {
                                case 'mindmap':
                                  return <ProfessionalMindmapRenderer data={data as MindmapData} title={note.title} />;
                                case 'flowchart':
                                  return <FlowchartRenderer data={data as FlowchartData} />;
                                case 'timeline':
                                  return <ProfessionalTimelineRenderer data={data as TimelineData} />;
                                case 'chart':
                                  return <ChartRenderer data={data as ChartData} />;
                                case 'venndiagram':
                                  return <VennDiagramRenderer data={data as VennDiagramData} />;
                                case 'conceptmap':
                                  return <ConceptMapRenderer data={data as ConceptMapData} />;
                                case 'fishbone':
                                  return <FishboneRenderer data={data as FishboneData} />;
                                case 'decisiontree':
                                  return <DecisionTreeRenderer data={data as DecisionTreeData} />;
                                case 'swot':
                                  return <SWOTRenderer data={data as SWOTData} />;
                                case 'pestel':
                                  return <PESTELRenderer data={data as PESTELData} />;
                                case 'kanban':
                                  return <KanbanRenderer data={data as KanbanData} />;
                                case 'vocabulary':
                                  return <VocabularyRenderer data={data as VocabularyListData} />;
                                case 'piechart':
                                  return <PieChartRenderer data={data as PieChartData} />;
                                default:
                                  return <div dangerouslySetInnerHTML={{ __html: marked(Array.isArray(note.content) ? note.content.join('\n') : note.content) as string }} />;
                              }
                            } catch {
                              return <div dangerouslySetInnerHTML={{ __html: marked(Array.isArray(note.content) ? note.content.join('\n') : note.content) as string }} />;
                            }
                          })()
                        ) : (
                          <div dangerouslySetInnerHTML={{ __html: marked(Array.isArray(note.content) ? note.content.join('\n') : note.content) as string }} />
                        )}
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
  );
}