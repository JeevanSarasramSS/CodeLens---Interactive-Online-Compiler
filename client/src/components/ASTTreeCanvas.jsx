import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================
// Layout Algorithm — Reingold-Tilford style tree positioning
// ============================================================

const NODE_W = 120;
const NODE_H = 34;
const H_GAP = 16;
const V_GAP = 56;

function layoutTree(node, depth = 0, posMap = new Map(), counter = { x: 0 }) {
  if (!node) return posMap;

  const id = nodeId(node, depth, counter.x);

  if (node.children && node.children.length > 0) {
    node.children.forEach(child => layoutTree(child, depth + 1, posMap, counter));

    const childPositions = node.children.map(c => posMap.get(nodeId(c, depth + 1, -1)) || posMap.get(findNodeId(c, posMap)));
    const validPositions = childPositions.filter(Boolean);

    if (validPositions.length > 0) {
      const minX = Math.min(...validPositions.map(p => p.x));
      const maxX = Math.max(...validPositions.map(p => p.x));
      posMap.set(id, { x: (minX + maxX) / 2, y: depth * (NODE_H + V_GAP), id, node, depth });
    } else {
      posMap.set(id, { x: counter.x * (NODE_W + H_GAP), y: depth * (NODE_H + V_GAP), id, node, depth });
      counter.x++;
    }
  } else {
    posMap.set(id, { x: counter.x * (NODE_W + H_GAP), y: depth * (NODE_H + V_GAP), id, node, depth });
    counter.x++;
  }

  return posMap;
}

function nodeId(node, depth, index) {
  return `${node.type}_${node.label || ''}_${depth}_${index}`;
}

function findNodeId(node, posMap) {
  for (const [key, val] of posMap) {
    if (val.node === node) return key;
  }
  return null;
}

// Better layout: assign positions bottom-up
function computeLayout(root) {
  if (!root) return { nodes: [], edges: [], width: 0, height: 0 };

  const nodes = [];
  const edges = [];
  let leafIndex = 0;

  function measure(node, depth) {
    if (!node) return { center: 0, left: 0, right: 0 };

    if (!node.children || node.children.length === 0) {
      const x = leafIndex * (NODE_W + H_GAP);
      leafIndex++;
      nodes.push({ x, y: depth * (NODE_H + V_GAP), node, depth, id: nodes.length });
      return { center: x, left: x, right: x, nodeIdx: nodes.length - 1 };
    }

    const childResults = node.children.map(c => measure(c, depth + 1));
    const left = childResults[0].center;
    const right = childResults[childResults.length - 1].center;
    const center = (left + right) / 2;

    const parentIdx = nodes.length;
    nodes.push({ x: center, y: depth * (NODE_H + V_GAP), node, depth, id: parentIdx });

    childResults.forEach(cr => {
      edges.push({ from: parentIdx, to: cr.nodeIdx });
    });

    return { center, left, right, nodeIdx: parentIdx };
  }

  measure(root, 0);

  // Calculate bounds
  const maxX = Math.max(...nodes.map(n => n.x)) + NODE_W;
  const maxY = Math.max(...nodes.map(n => n.y)) + NODE_H;

  return { nodes, edges, width: maxX + 40, height: maxY + 40 };
}

// ============================================================
// Node Color Mapping
// ============================================================

const NODE_COLORS = {
  Program:               { bg: 'rgba(99,102,241,0.2)',  border: '#6366f1', text: '#818cf8', icon: '📦' },
  FunctionDeclaration:   { bg: 'rgba(139,92,246,0.2)',  border: '#8b5cf6', text: '#a78bfa', icon: '⚡' },
  VariableDeclaration:   { bg: 'rgba(16,185,129,0.2)',  border: '#10b981', text: '#34d399', icon: '📌' },
  ArrayDeclaration:      { bg: 'rgba(16,185,129,0.2)',  border: '#10b981', text: '#34d399', icon: '📊' },
  BinaryExpression:      { bg: 'rgba(244,63,94,0.2)',   border: '#f43f5e', text: '#fb7185', icon: '➕' },
  UnaryExpression:       { bg: 'rgba(244,63,94,0.2)',   border: '#f43f5e', text: '#fb7185', icon: '±' },
  PostfixExpression:     { bg: 'rgba(244,63,94,0.2)',   border: '#f43f5e', text: '#fb7185', icon: '±' },
  AssignmentExpression:  { bg: 'rgba(248,113,113,0.15)',border: '#f87171', text: '#f87171', icon: '←' },
  IfStatement:           { bg: 'rgba(245,158,11,0.2)',  border: '#f59e0b', text: '#fbbf24', icon: '❓' },
  WhileStatement:        { bg: 'rgba(245,158,11,0.2)',  border: '#f59e0b', text: '#fbbf24', icon: '🔄' },
  ForStatement:          { bg: 'rgba(245,158,11,0.2)',  border: '#f59e0b', text: '#fbbf24', icon: '🔁' },
  DoWhileStatement:      { bg: 'rgba(245,158,11,0.2)',  border: '#f59e0b', text: '#fbbf24', icon: '🔁' },
  SwitchStatement:       { bg: 'rgba(245,158,11,0.2)',  border: '#f59e0b', text: '#fbbf24', icon: '🔀' },
  Literal:               { bg: 'rgba(34,211,238,0.2)',  border: '#22d3ee', text: '#22d3ee', icon: '#' },
  StringLiteral:         { bg: 'rgba(251,191,36,0.2)',  border: '#fbbf24', text: '#fbbf24', icon: '"' },
  CharLiteral:           { bg: 'rgba(251,191,36,0.2)',  border: '#fbbf24', text: '#fbbf24', icon: '\'' },
  Identifier:            { bg: 'rgba(192,132,252,0.2)', border: '#c084fc', text: '#c084fc', icon: 'x' },
  ReturnStatement:       { bg: 'rgba(249,115,22,0.2)',  border: '#f97316', text: '#fb923c', icon: '↩' },
  FunctionCall:          { bg: 'rgba(236,72,153,0.2)',  border: '#ec4899', text: '#f472b6', icon: '📞' },
  Block:                 { bg: 'rgba(100,116,139,0.15)',border: '#64748b', text: '#94a3b8', icon: '{ }' },
  Parameters:            { bg: 'rgba(139,92,246,0.15)', border: '#8b5cf6', text: '#a78bfa', icon: '( )' },
  Parameter:             { bg: 'rgba(139,92,246,0.1)',  border: '#7c3aed', text: '#a78bfa', icon: '→' },
  Condition:             { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#fbbf24', icon: '?' },
  Then:                  { bg: 'rgba(16,185,129,0.15)', border: '#10b981', text: '#34d399', icon: '✓' },
  Else:                  { bg: 'rgba(244,63,94,0.15)',  border: '#f43f5e', text: '#fb7185', icon: '✗' },
  Initializer:           { bg: 'rgba(99,102,241,0.15)', border: '#6366f1', text: '#818cf8', icon: '=' },
  ExpressionStatement:   { bg: 'rgba(148,163,184,0.12)',border: '#64748b', text: '#94a3b8', icon: '→' },
};

const DEFAULT_COLOR = { bg: 'rgba(148,163,184,0.1)', border: '#475569', text: '#94a3b8', icon: '•' };

function getNodeColor(type) {
  return NODE_COLORS[type] || DEFAULT_COLOR;
}

// ============================================================
// Main Component
// ============================================================

export default function ASTTreeCanvas({ ast }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 20, y: 20, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [collapsed, setCollapsed] = useState(new Set());
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  // Prune collapsed subtrees
  const prunedAST = useMemo(() => {
    if (!ast) return null;
    function prune(node, path = '0') {
      if (!node) return null;
      const pruned = { ...node, _path: path };
      if (collapsed.has(path) && node.children && node.children.length > 0) {
        pruned.children = [];
        pruned._collapsed = true;
      } else if (node.children) {
        pruned.children = node.children.map((c, i) => prune(c, `${path}-${i}`)).filter(Boolean);
      }
      return pruned;
    }
    return prune(ast);
  }, [ast, collapsed]);

  const layout = useMemo(() => computeLayout(prunedAST), [prunedAST]);

  // Fit to view on mount
  useEffect(() => {
    if (!containerRef.current || !layout.width) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = (rect.width - 40) / layout.width;
    const scaleY = (rect.height - 40) / layout.height;
    const scale = Math.min(scaleX, scaleY, 1);
    const x = (rect.width - layout.width * scale) / 2;
    const y = 20;
    setTransform({ x, y, scale });
  }, [layout]);

  // Zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.2, Math.min(3, prev.scale * delta))
    }));
  }, []);

  // Pan
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  }, [transform]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }));
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Toggle collapse
  const toggleCollapse = useCallback((path) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  // Zoom controls
  const zoomIn = () => setTransform(p => ({ ...p, scale: Math.min(3, p.scale * 1.2) }));
  const zoomOut = () => setTransform(p => ({ ...p, scale: Math.max(0.2, p.scale / 1.2) }));
  const resetZoom = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = (rect.width - 40) / layout.width;
    const scaleY = (rect.height - 40) / layout.height;
    const scale = Math.min(scaleX, scaleY, 1);
    setTransform({ x: (rect.width - layout.width * scale) / 2, y: 20, scale });
  };

  return (
    <div className="ast-canvas-container" ref={containerRef}>
      {/* Zoom Controls */}
      <div className="ast-zoom-controls">
        <button className="ast-zoom-btn" onClick={zoomIn} title="Zoom In">+</button>
        <button className="ast-zoom-btn" onClick={zoomOut} title="Zoom Out">−</button>
        <button className="ast-zoom-btn" onClick={resetZoom} title="Fit to View">⊡</button>
        <div className="ast-zoom-level">{Math.round(transform.scale * 100)}%</div>
      </div>

      {/* Legend */}
      <div className="ast-legend">
        <span className="ast-legend-hint">🖱 Scroll to zoom • Drag to pan • Click nodes to collapse</span>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="ast-svg"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Edges */}
          {layout.edges.map((edge, i) => {
            const from = layout.nodes[edge.from];
            const to = layout.nodes[edge.to];
            if (!from || !to) return null;

            const x1 = from.x + NODE_W / 2;
            const y1 = from.y + NODE_H;
            const x2 = to.x + NODE_W / 2;
            const y2 = to.y;
            const midY = (y1 + y2) / 2;

            return (
              <path
                key={`edge-${i}`}
                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                fill="none"
                stroke={getNodeColor(from.node.type).border}
                strokeWidth={1.5}
                strokeOpacity={0.4}
                className="ast-edge"
              />
            );
          })}

          {/* Nodes */}
          {layout.nodes.map((n, i) => {
            const color = getNodeColor(n.node.type);
            const label = n.node.label || n.node.type;
            const truncLabel = label.length > 14 ? label.slice(0, 13) + '…' : label;
            const hasChildren = n.node.children && n.node.children.length > 0;
            const isCollapsed = n.node._collapsed;
            const isHovered = hoveredNode === i;

            return (
              <g
                key={`node-${i}`}
                transform={`translate(${n.x}, ${n.y})`}
                className="ast-svg-node"
                onMouseEnter={(e) => {
                  setHoveredNode(i);
                  const rect = containerRef.current.getBoundingClientRect();
                  setTooltip({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top - 40,
                    type: n.node.type,
                    label: n.node.label || n.node.type,
                    line: n.node.loc?.line,
                    childCount: n.node.children?.length || 0,
                  });
                }}
                onMouseLeave={() => { setHoveredNode(null); setTooltip(null); }}
                onClick={() => {
                  if (hasChildren || isCollapsed) toggleCollapse(n.node._path);
                }}
                style={{ cursor: (hasChildren || isCollapsed) ? 'pointer' : 'default' }}
              >
                {/* Glow effect on hover */}
                {isHovered && (
                  <rect
                    x={-4} y={-4}
                    width={NODE_W + 8} height={NODE_H + 8}
                    rx={12} ry={12}
                    fill="none"
                    stroke={color.border}
                    strokeWidth={2}
                    strokeOpacity={0.5}
                    className="ast-node-glow"
                  />
                )}

                {/* Node background */}
                <rect
                  x={0} y={0}
                  width={NODE_W} height={NODE_H}
                  rx={8} ry={8}
                  fill={color.bg}
                  stroke={color.border}
                  strokeWidth={isHovered ? 2 : 1}
                  strokeOpacity={isHovered ? 0.9 : 0.5}
                />

                {/* Icon */}
                <text
                  x={10} y={NODE_H / 2 + 1}
                  fontSize={11}
                  dominantBaseline="central"
                  fill={color.text}
                >
                  {color.icon}
                </text>

                {/* Label */}
                <text
                  x={26} y={NODE_H / 2 + 1}
                  fontSize={11}
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight={500}
                  dominantBaseline="central"
                  fill={color.text}
                >
                  {truncLabel}
                </text>

                {/* Collapse indicator */}
                {isCollapsed && (
                  <circle
                    cx={NODE_W - 10} cy={NODE_H / 2}
                    r={6}
                    fill={color.border}
                    fillOpacity={0.3}
                  >
                    <title>Click to expand</title>
                  </circle>
                )}
                {isCollapsed && (
                  <text
                    x={NODE_W - 10} y={NODE_H / 2 + 1}
                    fontSize={9}
                    fontWeight={700}
                    fill={color.text}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    +
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="ast-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="ast-tooltip-type">{tooltip.type}</div>
          <div className="ast-tooltip-label">{tooltip.label}</div>
          {tooltip.line && <div className="ast-tooltip-line">Line {tooltip.line}</div>}
          {tooltip.childCount > 0 && <div className="ast-tooltip-children">{tooltip.childCount} children</div>}
        </div>
      )}

      {/* Node count */}
      <div className="ast-node-count">
        {layout.nodes.length} nodes • {layout.edges.length} edges
      </div>
    </div>
  );
}
