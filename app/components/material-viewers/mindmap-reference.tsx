'use client';

import React, { useMemo } from 'react';

type MindmapData = {
  type: 'mindmap';
  central: string;
  branches: Array<{
    topic: string;
    subs?: string[];
  }>;
};

type Props = {
  data: MindmapData;
  title?: string;
};

type NodeBox = {
  id: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  level: 0 | 1 | 2;
};

function clampText(input: string, max = 76) {
  const value = (input || '').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function estimateWidth(text: string, base = 108) {
  const clean = clampText(text);
  return Math.max(base, Math.min(340, clean.length * 7.1 + 34));
}

function pathCurve(fromX: number, fromY: number, toX: number, toY: number) {
  const dx = Math.max(80, (toX - fromX) * 0.45);
  return `M ${fromX} ${fromY} C ${fromX + dx} ${fromY}, ${toX - dx} ${toY}, ${toX} ${toY}`;
}

export function ReferenceMindmapRenderer({ data, title }: Props) {
  const centralText = clampText(title || data.central || 'Mindmap');
  const branches = Array.isArray(data?.branches) ? data.branches : [];

  const layout = useMemo(() => {
    const marginX = 26;
    const marginY = 26;
    const levelGap = 210;
    const verticalGap = 16;

    const centralW = estimateWidth(centralText, 132);
    const centralH = 44;
    const central: NodeBox = {
      id: 'central',
      text: centralText,
      x: marginX,
      y: marginY,
      w: centralW,
      h: centralH,
      level: 0,
    };

    const nodes: NodeBox[] = [central];
    const links: Array<{ from: string; to: string; weight: 1 | 2 }> = [];
    let cursorY = marginY;
    let maxY = marginY + centralH;
    let maxX = marginX + centralW;

    branches.forEach((branch, i) => {
      const branchText = clampText(branch?.topic || `Branch ${i + 1}`);
      const branchW = estimateWidth(branchText, 124);
      const branchH = 42;
      const branchSubs = (branch?.subs || []).filter(Boolean).map((v) => clampText(v, 88));
      const branchBlockH = Math.max(branchH, branchSubs.length * 40 + Math.max(0, branchSubs.length - 1) * 10);
      const branchY = cursorY + Math.max(0, (branchBlockH - branchH) / 2);
      const branchX = central.x + central.w + levelGap;
      const branchId = `b-${i}`;

      nodes.push({
        id: branchId,
        text: branchText,
        x: branchX,
        y: branchY,
        w: branchW,
        h: branchH,
        level: 1,
      });
      links.push({ from: 'central', to: branchId, weight: 2 });

      maxX = Math.max(maxX, branchX + branchW);
      maxY = Math.max(maxY, branchY + branchH);

      if (branchSubs.length > 0) {
        branchSubs.forEach((sub, j) => {
          const subW = estimateWidth(sub, 132);
          const subH = 38;
          const subX = branchX + branchW + levelGap;
          const subY = cursorY + j * (subH + 10);
          const subId = `s-${i}-${j}`;
          nodes.push({
            id: subId,
            text: sub,
            x: subX,
            y: subY,
            w: subW,
            h: subH,
            level: 2,
          });
          links.push({ from: branchId, to: subId, weight: 1 });
          maxX = Math.max(maxX, subX + subW);
          maxY = Math.max(maxY, subY + subH);
        });
      }

      cursorY += branchBlockH + verticalGap;
    });

    const viewW = Math.max(980, maxX + marginX);
    const viewH = Math.max(540, maxY + marginY);
    return { nodes, links, viewW, viewH };
  }, [branches, centralText]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, NodeBox>();
    layout.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [layout.nodes]);

  return (
    <div className="rounded-xl border border-slate-800 bg-[#070b10] p-3 shadow-inner">
      <div className="overflow-auto rounded-lg border border-slate-800 bg-[#05080d]">
        <svg
          width={layout.viewW}
          height={layout.viewH}
          viewBox={`0 0 ${layout.viewW} ${layout.viewH}`}
          className="block min-h-[540px] min-w-full"
        >
          {layout.links.map((link) => {
            const from = nodeMap.get(link.from);
            const to = nodeMap.get(link.to);
            if (!from || !to) return null;
            const fromX = from.x + from.w;
            const fromY = from.y + from.h / 2;
            const toX = to.x;
            const toY = to.y + to.h / 2;
            return (
              <path
                key={`${link.from}-${link.to}`}
                d={pathCurve(fromX, fromY, toX, toY)}
                fill="none"
                stroke={link.weight === 2 ? '#9ec6ff' : '#80e8df'}
                strokeOpacity={0.95}
                strokeWidth={link.weight === 2 ? 2.1 : 1.8}
                strokeLinecap="round"
              />
            );
          })}

          {layout.nodes.map((node) => {
            const fill =
              node.level === 0 ? '#343e53' : node.level === 1 ? '#264041' : '#385745';
            const stroke =
              node.level === 0 ? '#7ea6ff' : node.level === 1 ? '#7fe4de' : '#9be7ba';
            return (
              <g key={node.id}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={node.w}
                  height={node.h}
                  rx={8}
                  fill={fill}
                  stroke={stroke}
                  strokeOpacity={0.25}
                />
                <text
                  x={node.x + 12}
                  y={node.y + node.h / 2}
                  fill="#e7eefb"
                  dominantBaseline="middle"
                  fontSize={12}
                  fontWeight={500}
                >
                  {node.text}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

