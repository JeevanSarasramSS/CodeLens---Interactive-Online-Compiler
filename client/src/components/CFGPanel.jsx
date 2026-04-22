import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================
// CFG Panel — Control Flow Graph Visualization
// ============================================================

const BLOCK_W = 220;
const BLOCK_MIN_H = 48;
const BLOCK_LINE_H = 20;
const BLOCK_PAD = 12;
const LAYER_GAP = 80;
const COL_GAP = 40;

const BLOCK_COLORS = {
  entry:     { bg: 'rgba(16,185,129,0.15)',  border: '#10b981', header: '#34d399' },
  exit:      { bg: 'rgba(244,63,94,0.15)',   border: '#f43f5e', header: '#fb7185' },
  condition: { bg: 'rgba(245,158,11,0.15)',  border: '#f59e0b', header: '#fbbf24' },
  return:    { bg: 'rgba(249,115,22,0.15)',  border: '#f97316', header: '#fb923c' },
  call:      { bg: 'rgba(236,72,153,0.15)',  border: '#ec4899', header: '#f472b6' },
  normal:    { bg: 'rgba(99,102,241,0.12)',  border: '#6366f1', header: '#818cf8' },
};

const EDGE_COLORS = {
  true:          '#10b981',
  false:         '#f43f5e',
  loop:          '#f59e0b',
  unconditional: '#6366f1',
  fallthrough:   '#475569',
  return:        '#f97316',
};

function layoutCFG(blocks, edges) {
  if (!blocks || blocks.length === 0) return { positions: [], width: 0, height: 0 };

  // Simple layered layout: assign layers based on topological order
  const layers = new Array(blocks.length).fill(0);
  const visited = new Set();

  function assignLayer(idx, layer) {
    if (visited.has(idx)) return;
    visited.add(idx);
    layers[idx] = Math.max(layers[idx], layer);

    edges.filter(e => e.from === idx && e.type !== 'loop').forEach(e => {
      assignLayer(e.to, layer + 1);
    });
  }

  assignLayer(0, 0);

  // Group blocks by layer
  const layerGroups = {};
  layers.forEach((layer, idx) => {
    if (!layerGroups[layer]) layerGroups[layer] = [];
    layerGroups[layer].push(idx);
  });

  // Position blocks
  const positions = [];
  const maxLayer = Math.max(...layers);

  for (let layer = 0; layer <= maxLayer; layer++) {
    const group = layerGroups[layer] || [];
    const totalWidth = group.length * BLOCK_W + (group.length - 1) * COL_GAP;
    const startX = -totalWidth / 2;

    group.forEach((blockIdx, colIdx) => {
      const block = blocks[blockIdx];
      const instCount = block.instructions.length;
      const blockH = BLOCK_MIN_H + instCount * BLOCK_LINE_H;
      const x = startX + colIdx * (BLOCK_W + COL_GAP);
      const y = layer * (blockH + LAYER_GAP);
      positions[blockIdx] = { x, y, w: BLOCK_W, h: blockH };
    });
  }

  // Calculate bounds
  const allX = positions.filter(Boolean).map(p => [p.x, p.x + p.w]).flat();
  const allY = positions.filter(Boolean).map(p => [p.y, p.y + p.h]).flat();
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);

  // Normalize positions
  positions.forEach(p => {
    if (p) {
      p.x -= minX - 40;
      p.y -= minY - 40;
    }
  });

  return {
    positions,
    width: maxX - minX + 80,
    height: maxY - minY + 80,
  };
}

export default function CFGPanel({ data }) {
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredBlock, setHoveredBlock] = useState(null);

  if (!data) return (
    <div className="empty-state">
      <div className="empty-icon">🔀</div>
      <div className="empty-text">Click <strong>"Run with Compilation Steps"</strong> to generate the Control Flow Graph</div>
      <div className="empty-hint">Shows how the program's execution can flow through different paths</div>
    </div>
  );

  const { blocks, edges } = data;

  if (!blocks || blocks.length === 0) return (
    <div className="empty-state">
      <div className="empty-icon">🔀</div>
      <div className="empty-text">No control flow graph to display</div>
    </div>
  );

  const layout = useMemo(() => layoutCFG(blocks, edges), [blocks, edges]);

  // Fit to view
  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = (rect.width - 40) / layout.width;
    const scaleY = (rect.height - 40) / layout.height;
    const scale = Math.min(scaleX, scaleY, 0.85);
    const x = (rect.width - layout.width * scale) / 2;
    const y = 20;
    setTransform({ x, y, scale });
  }, [layout]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({ ...prev, scale: Math.max(0.15, Math.min(3, prev.scale * delta)) }));
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  }, [transform]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    setTransform(prev => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const zoomIn = () => setTransform(p => ({ ...p, scale: Math.min(3, p.scale * 1.2) }));
  const zoomOut = () => setTransform(p => ({ ...p, scale: Math.max(0.15, p.scale / 1.2) }));
  const resetZoom = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = (rect.width - 40) / layout.width;
    const scaleY = (rect.height - 40) / layout.height;
    const scale = Math.min(scaleX, scaleY, 0.85);
    setTransform({ x: (rect.width - layout.width * scale) / 2, y: 20, scale });
  };

  // Edge path with arrow
  function renderEdge(edge, i) {
    const fromPos = layout.positions[edge.from];
    const toPos = layout.positions[edge.to];
    if (!fromPos || !toPos) return null;

    const color = EDGE_COLORS[edge.type] || EDGE_COLORS.fallthrough;
    const isLoop = edge.type === 'loop';

    let x1 = fromPos.x + fromPos.w / 2;
    let y1 = fromPos.y + fromPos.h;
    let x2 = toPos.x + toPos.w / 2;
    let y2 = toPos.y;

    let pathD;
    if (isLoop) {
      // Loop back-edge: curve to the right side
      const offsetX = BLOCK_W / 2 + 40;
      x1 = fromPos.x + fromPos.w;
      y1 = fromPos.y + fromPos.h / 2;
      x2 = toPos.x + toPos.w;
      y2 = toPos.y + toPos.h / 2;
      pathD = `M ${x1} ${y1} C ${x1 + offsetX} ${y1}, ${x2 + offsetX} ${y2}, ${x2} ${y2}`;
    } else {
      const midY = (y1 + y2) / 2;
      pathD = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
    }

    return (
      <g key={`edge-${i}`}>
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeOpacity={0.7}
          strokeDasharray={isLoop ? '6,4' : 'none'}
          markerEnd={`url(#arrow-${edge.type})`}
        />
        {edge.label && (
          <text
            x={(x1 + x2) / 2 + (isLoop ? 30 : 0)}
            y={(y1 + y2) / 2 + (isLoop ? 0 : -6)}
            fontSize={11}
            fontWeight={700}
            fill={color}
            textAnchor="middle"
            fontFamily="'Inter', sans-serif"
          >
            {edge.label}
          </text>
        )}
      </g>
    );
  }

  function renderBlock(block, idx) {
    const pos = layout.positions[idx];
    if (!pos) return null;
    const colors = BLOCK_COLORS[block.type] || BLOCK_COLORS.normal;
    const isHovered = hoveredBlock === idx;

    return (
      <g
        key={`block-${idx}`}
        transform={`translate(${pos.x}, ${pos.y})`}
        onMouseEnter={() => setHoveredBlock(idx)}
        onMouseLeave={() => setHoveredBlock(null)}
      >
        {/* Glow */}
        {isHovered && (
          <rect
            x={-3} y={-3} width={pos.w + 6} height={pos.h + 6}
            rx={10} ry={10}
            fill="none" stroke={colors.border} strokeWidth={2} strokeOpacity={0.4}
          />
        )}

        {/* Block bg */}
        <rect
          x={0} y={0} width={pos.w} height={pos.h}
          rx={8} ry={8}
          fill={colors.bg}
          stroke={colors.border}
          strokeWidth={isHovered ? 2 : 1}
          strokeOpacity={isHovered ? 0.9 : 0.5}
        />

        {/* Header */}
        <rect
          x={0} y={0} width={pos.w} height={28}
          rx={8} ry={8}
          fill={colors.border}
          fillOpacity={0.15}
        />
        {/* Fix bottom corners of header */}
        <rect
          x={0} y={14} width={pos.w} height={14}
          fill={colors.border}
          fillOpacity={0.15}
        />

        <text
          x={BLOCK_PAD} y={18}
          fontSize={11}
          fontWeight={700}
          fontFamily="'Inter', sans-serif"
          fill={colors.header}
        >
          {block.label}
        </text>

        {/* Type badge */}
        <text
          x={pos.w - BLOCK_PAD} y={18}
          fontSize={9}
          fontWeight={600}
          fontFamily="'Inter', sans-serif"
          fill={colors.header}
          textAnchor="end"
          opacity={0.6}
        >
          {block.type.toUpperCase()}
        </text>

        {/* Instructions */}
        {block.instructions.map((inst, ii) => (
          <text
            key={ii}
            x={BLOCK_PAD}
            y={38 + ii * BLOCK_LINE_H}
            fontSize={10}
            fontFamily="'JetBrains Mono', monospace"
            fill={inst.instruction.includes('goto') ? '#f59e0b' : inst.instruction.includes('if ') ? '#fbbf24' : '#94a3b8'}
          >
            {inst.instruction.length > 28 ? inst.instruction.slice(0, 27) + '…' : inst.instruction}
          </text>
        ))}
      </g>
    );
  }

  return (
    <div className="cfg-container" ref={containerRef}>
      {/* Stats */}
      <div className="cfg-stats">
        <span className="cfg-stat-item">{blocks.length} basic blocks</span>
        <span className="cfg-stat-sep">•</span>
        <span className="cfg-stat-item">{edges.length} edges</span>
        <span className="cfg-stat-sep">•</span>
        <span className="cfg-stat-item">{edges.filter(e => e.type === 'loop').length} loops</span>
      </div>

      {/* Zoom Controls */}
      <div className="ast-zoom-controls">
        <button className="ast-zoom-btn" onClick={zoomIn}>+</button>
        <button className="ast-zoom-btn" onClick={zoomOut}>−</button>
        <button className="ast-zoom-btn" onClick={resetZoom}>⊡</button>
        <div className="ast-zoom-level">{Math.round(transform.scale * 100)}%</div>
      </div>

      {/* Legend */}
      <div className="cfg-legend">
        <div className="cfg-legend-item"><span className="cfg-legend-line" style={{ background: EDGE_COLORS.true }}></span> True</div>
        <div className="cfg-legend-item"><span className="cfg-legend-line" style={{ background: EDGE_COLORS.false }}></span> False</div>
        <div className="cfg-legend-item"><span className="cfg-legend-line cfg-legend-dashed" style={{ background: EDGE_COLORS.loop }}></span> Loop</div>
        <div className="cfg-legend-item"><span className="cfg-legend-line" style={{ background: EDGE_COLORS.unconditional }}></span> Jump</div>
      </div>

      <svg
        className="cfg-svg"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      >
        <defs>
          {Object.entries(EDGE_COLORS).map(([type, color]) => (
            <marker
              key={type}
              id={`arrow-${type}`}
              viewBox="0 0 10 10"
              refX={9} refY={5}
              markerWidth={8} markerHeight={8}
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={color} fillOpacity={0.7} />
            </marker>
          ))}
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {edges.map((e, i) => renderEdge(e, i))}
          {blocks.map((b, i) => renderBlock(b, i))}
        </g>
      </svg>
    </div>
  );
}
