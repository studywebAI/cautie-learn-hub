import React from 'react';

type MindmapData = {
  type: 'mindmap';
  central: string;
  branches: Array<{
    topic: string;
    subs?: string[];
  }>;
};

function MindmapRenderer({ data }: { data: MindmapData }) {
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  // Increased SVG size to prevent cut-off
  const svgWidth = 800;
  const svgHeight = 600;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

  // Better sizing calculations
  const centralRadius = Math.max(50, Math.min(70, data.central.length * 1.5));
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
      className="relative border rounded overflow-hidden bg-gray-50"
      style={{ width: `${svgWidth}px`, height: `${svgHeight}px` }}
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
          {wrapText(data.central, centralRadius * 1.8, 14).map((line, i) => (
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

export default MindmapRenderer;