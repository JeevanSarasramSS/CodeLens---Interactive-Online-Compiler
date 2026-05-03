import { useState, useCallback, useMemo, memo } from 'react';
import { learningAction } from '../utils/api';
import TokensPanel from './TokensPanel';
import CFGPanel from './CFGPanel';
import OptimizationPanel from './OptimizationPanel';
import IRCodePanel from './IRCodePanel';

// ============================================================
// UNIT & MODULE DEFINITIONS
// ============================================================
const UNITS = [
  { id: 1, label: 'Unit 1', title: 'Foundations', icon: '🧱', color: '#6366f1' },
  { id: 2, label: 'Unit 2', title: 'Top-Down Parsing', icon: '📐', color: '#10b981' },
  { id: 3, label: 'Unit 3', title: 'Bottom-Up Parsing', icon: '🔄', color: '#f59e0b' },
  { id: 4, label: 'Unit 4', title: 'Code Generation', icon: '⚙️', color: '#22d3ee' },
  { id: 5, label: 'Unit 5', title: 'Optimization', icon: '🚀', color: '#f43f5e' },
];

const MODULES = {
  1: [
    { id: 'tokenizer', label: 'Tokenizer Playground', icon: '🔤', action: 'tokenize',
      inputType: 'code', placeholder: '#include <stdio.h>\nint main() {\n    int x = 10;\n    printf("x=%d\\n", x);\n    return 0;\n}',
      hint: 'Paste any C code to see how the lexer breaks it into tokens' },
    { id: 'automata', label: 'Regex → NFA/DFA', icon: '🔀', action: 'automata',
      inputType: 'regex', placeholder: '(a|b)*abb',
      hint: 'Enter a regular expression to visualize NFA and DFA construction' },
  ],
  2: [
    { id: 'firstFollow', label: 'FIRST & FOLLOW Sets', icon: '📋', action: 'firstFollow',
      inputType: 'grammar', placeholder: "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id",
      hint: 'Enter a grammar (one production per line, | for alternatives)' },
    { id: 'leftRecursion', label: 'Left Recursion Removal', icon: '🔧', action: 'leftRecursion',
      inputType: 'grammar', placeholder: 'E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id',
      hint: 'Enter a grammar with left recursion to see the transformation' },
  ],
  3: [
    { id: 'shiftReduce', label: 'Shift-Reduce Parser', icon: '📚', action: 'shiftReduce',
      inputType: 'grammarAndInput',
      grammarPlaceholder: 'E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id',
      inputPlaceholder: 'id + id * id',
      hint: 'Enter a grammar and input string to simulate bottom-up parsing' },
  ],
  4: [
    { id: 'threeAC', label: 'Expression → 3AC', icon: '📝', action: 'threeAC',
      inputType: 'code', placeholder: '#include <stdio.h>\nint main() {\n    int a = 5;\n    int b = a + 3;\n    int c = a * b - 2;\n    return 0;\n}',
      hint: 'Enter C code to generate Three-Address Code (intermediate representation)' },
    { id: 'postfix', label: 'Postfix / Prefix Converter', icon: '🔢', action: 'postfix',
      inputType: 'expression', placeholder: 'a + b * c - d / e',
      hint: 'Enter an infix expression to convert to postfix and prefix notation' },
  ],
  5: [
    { id: 'cfg', label: 'CFG & Basic Blocks', icon: '🔀', action: 'cfg',
      inputType: 'code', placeholder: '#include <stdio.h>\nint main() {\n    int x = 10;\n    if (x > 5) {\n        x = x + 1;\n    } else {\n        x = x - 1;\n    }\n    return x;\n}',
      hint: 'Enter C code to visualize the Control Flow Graph' },
    { id: 'optimize', label: 'Code Optimization', icon: '🚀', action: 'optimize',
      inputType: 'code', placeholder: '#include <stdio.h>\nint main() {\n    int a = 5;\n    int b = 10;\n    int c = a + b;\n    int d = a + b;\n    int unused = 42;\n    return c;\n}',
      hint: 'Enter C code to see optimization techniques in action' },
  ],
};

const EXPLANATIONS = {
  tokenizer: { title: 'Lexical Analysis', text: 'The lexer scans source code character by character and groups them into tokens — the smallest meaningful units like keywords, identifiers, and operators.' },
  automata: { title: 'Finite Automata', text: 'Regular expressions are converted to NFAs (Thompson\'s Construction), then to DFAs (Subset Construction) for efficient pattern matching — the foundation of lexer design.' },
  firstFollow: { title: 'FIRST & FOLLOW Sets', text: 'FIRST sets tell which terminals can begin a derivation. FOLLOW sets tell which terminals can appear after a non-terminal. Together they build LL(1) parsing tables.' },
  leftRecursion: { title: 'Left Recursion Elimination', text: 'Left-recursive grammars cause infinite loops in top-down parsers. We transform A → Aα | β into A → βA\' and A\' → αA\' | ε to enable predictive parsing.' },
  shiftReduce: { title: 'Shift-Reduce Parsing', text: 'Bottom-up parsing builds the parse tree from leaves to root. SHIFT pushes input onto the stack, REDUCE replaces stack symbols using grammar rules.' },
  threeAC: { title: 'Three-Address Code', text: 'IR uses at most three operands per instruction (e.g., t1 = a + b). This simplified form makes optimization and target code generation straightforward.' },
  postfix: { title: 'Expression Conversion', text: 'The Shunting-Yard algorithm converts infix (a+b) to postfix (ab+) using a stack. Postfix eliminates parentheses and makes evaluation order explicit.' },
  cfg: { title: 'Control Flow Graph', text: 'The CFG divides code into basic blocks (straight-line sequences) connected by edges showing execution paths — branches, loops, and fall-throughs.' },
  optimize: { title: 'Code Optimization', text: 'The optimizer transforms IR to be faster/smaller: constant folding evaluates constants at compile time, dead code elimination removes unused code.' },
};

// ============================================================
// AUTOMATA SVG RENDERER
// ============================================================
const AutomataGraph = memo(function AutomataGraph({ data, title }) {
  if (!data || !data.nodes || data.nodes.length === 0) return null;
  const { nodes, edges } = data;
  const R = 24;
  const W = Math.min(nodes.length * 120, 800);
  const H = 200;

  // Simple circular/row layout
  const positions = {};
  const cols = Math.ceil(Math.sqrt(nodes.length));
  nodes.forEach((n, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    positions[n.id] = {
      x: 60 + col * 110,
      y: 60 + row * 100,
    };
  });

  const svgW = Math.max(W, cols * 110 + 80);
  const svgH = Math.max(H, (Math.ceil(nodes.length / cols)) * 100 + 80);

  return (
    <div className="lm-automata-block">
      <div className="lm-automata-title">{title}</div>
      <svg width="100%" height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="lm-automata-svg">
        <defs>
          <marker id={`lm-arrow-${title}`} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" fillOpacity={0.8} />
          </marker>
        </defs>
        {/* Edges */}
        {edges.map((e, i) => {
          const from = positions[e.from];
          const to = positions[e.to];
          if (!from || !to) return null;
          const isSelf = e.from === e.to;
          if (isSelf) {
            return (
              <g key={`e-${i}`}>
                <path d={`M ${from.x} ${from.y - R} A 20 20 0 1 1 ${from.x + R} ${from.y}`}
                  fill="none" stroke="#6366f1" strokeWidth={1.5} markerEnd={`url(#lm-arrow-${title})`} />
                <text x={from.x + 8} y={from.y - R - 10} fontSize={10} fill="#a78bfa" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">{e.symbol}</text>
              </g>
            );
          }
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const dist = Math.sqrt(dx*dx + dy*dy) || 1;
          const x1 = from.x + (dx/dist)*R;
          const y1 = from.y + (dy/dist)*R;
          const x2 = to.x - (dx/dist)*R;
          const y2 = to.y - (dy/dist)*R;
          const mx = (x1+x2)/2;
          const my = (y1+y2)/2 - 15;
          return (
            <g key={`e-${i}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={e.symbol === 'ε' ? '#f59e0b' : '#6366f1'} strokeWidth={1.5} strokeOpacity={0.7} markerEnd={`url(#lm-arrow-${title})`} />
              <text x={mx} y={my} fontSize={10} fill={e.symbol === 'ε' ? '#fbbf24' : '#a78bfa'} textAnchor="middle" fontWeight={600} fontFamily="'JetBrains Mono', monospace">{e.symbol}</text>
            </g>
          );
        })}
        {/* Start arrow */}
        {nodes.filter(n => n.isStart).map(n => {
          const p = positions[n.id];
          return <line key="start-arr" x1={p.x - R - 25} y1={p.y} x2={p.x - R - 2} y2={p.y} stroke="#10b981" strokeWidth={2} markerEnd={`url(#lm-arrow-${title})`} />;
        })}
        {/* Nodes */}
        {nodes.map(n => {
          const p = positions[n.id];
          return (
            <g key={`n-${n.id}`}>
              {n.isAccept && <circle cx={p.x} cy={p.y} r={R + 4} fill="none" stroke="#a78bfa" strokeWidth={1.5} />}
              <circle cx={p.x} cy={p.y} r={R} fill={n.isStart ? 'rgba(16,185,129,0.15)' : n.isAccept ? 'rgba(167,139,250,0.15)' : 'rgba(99,102,241,0.1)'} stroke={n.isStart ? '#10b981' : n.isAccept ? '#a78bfa' : '#6366f1'} strokeWidth={1.5} />
              <text x={p.x} y={p.y + 4} fontSize={11} fill="#e2e8f0" textAnchor="middle" fontWeight={600} fontFamily="'Inter', sans-serif">{n.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});

// ============================================================
// RESULT RENDERERS (per module)
// ============================================================
function renderResult(moduleId, result) {
  if (!result) return null;
  if (result.error) return <div className="lm-error">❌ {result.error}</div>;

  switch (moduleId) {
    case 'tokenizer':
      return <TokensPanel data={{ tokens: result.tokens, summary: result.summary, tokenCount: result.count }} liveTokens={null} highlightedToken={-1} onTokenClick={null} />;

    case 'automata':
      return (
        <div className="lm-automata-container">
          <AutomataGraph data={result.nfa} title="NFA" />
          <AutomataGraph data={result.dfa} title="DFA" />
          {result.dfaMapping && (
            <div className="lm-dfa-mapping">
              <div className="lm-section-title">DFA State Mapping</div>
              <div className="lm-mapping-chips">
                {result.dfaMapping.map((m, i) => (
                  <span key={i} className="lm-mapping-chip">D{m.dfaState} = {'{'}q{m.nfaStates.join(', q')}{'}'}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      );

    case 'firstFollow':
      return (
        <div className="lm-ff-container">
          <div className="lm-ff-grid">
            <div className="lm-ff-table-wrap">
              <div className="lm-section-title">FIRST Sets</div>
              <table className="lm-table"><thead><tr><th>Non-Terminal</th><th>FIRST</th></tr></thead><tbody>
                {Object.entries(result.firstSets || {}).map(([nt, set]) => (
                  <tr key={nt}><td className="lm-nt">{nt}</td><td className="lm-set">{`{ ${set.join(', ')} }`}</td></tr>
                ))}
              </tbody></table>
            </div>
            <div className="lm-ff-table-wrap">
              <div className="lm-section-title">FOLLOW Sets</div>
              <table className="lm-table"><thead><tr><th>Non-Terminal</th><th>FOLLOW</th></tr></thead><tbody>
                {Object.entries(result.followSets || {}).map(([nt, set]) => (
                  <tr key={nt}><td className="lm-nt">{nt}</td><td className="lm-set">{`{ ${set.join(', ')} }`}</td></tr>
                ))}
              </tbody></table>
            </div>
          </div>
          {result.parsingTable && Object.keys(result.parsingTable).length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="lm-section-title">LL(1) Parsing Table {result.isLL1 ? <span className="lm-badge-ok">✓ LL(1)</span> : <span className="lm-badge-err">✗ Conflicts</span>}</div>
              <div className="lm-parse-table-scroll">
                <table className="lm-table lm-parse-table">
                  <thead><tr><th></th>{(result.terminals || []).map(t => <th key={t}>{t}</th>)}</tr></thead>
                  <tbody>
                    {(result.nonTerminals || []).map(nt => (
                      <tr key={nt}><td className="lm-nt">{nt}</td>
                        {(result.terminals || []).map(t => (
                          <td key={t} className={result.parsingTable[nt]?.[t] ? 'lm-cell-filled' : 'lm-cell-empty'}>
                            {result.parsingTable[nt]?.[t] || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      );

    case 'leftRecursion':
      return (
        <div className="lm-lr-container">
          <div className="lm-lr-compare">
            <div className="lm-lr-box">
              <div className="lm-section-title">Original Grammar</div>
              <pre className="lm-grammar-pre">{result.originalText}</pre>
            </div>
            <div className="lm-lr-arrow">→</div>
            <div className="lm-lr-box lm-lr-box-result">
              <div className="lm-section-title">Transformed Grammar</div>
              <pre className="lm-grammar-pre">{result.transformedText}</pre>
            </div>
          </div>
          <div className="lm-steps">
            <div className="lm-section-title">Steps</div>
            {(result.steps || []).map((s, i) => (
              <div key={i} className={`lm-step-item lm-step-${s.type}`}>
                <span className="lm-step-badge">{s.type === 'detect' ? '🔍' : s.type === 'transform' ? '✨' : 'ℹ️'}</span>
                <span>{s.message}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'shiftReduce':
      return (
        <div>
          <div className="lm-sr-result">{result.accepted ? <span className="lm-badge-ok">✅ Accepted</span> : <span className="lm-badge-err">❌ Rejected</span>}</div>
          <table className="lm-table lm-sr-table">
            <thead><tr><th>Step</th><th>Stack</th><th>Input</th><th>Action</th></tr></thead>
            <tbody>
              {(result.steps || []).map((s, i) => (
                <tr key={i} className={s.action.includes('Reduce') ? 'lm-row-reduce' : s.action.includes('Shift') ? 'lm-row-shift' : s.action.includes('✅') ? 'lm-row-accept' : ''}>
                  <td>{s.step}</td>
                  <td className="lm-mono">{s.stack}</td>
                  <td className="lm-mono">{s.input}</td>
                  <td className={s.action.includes('Reduce') ? 'lm-action-reduce' : s.action.includes('Shift') ? 'lm-action-shift' : ''}>{s.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'threeAC':
      return <IRCodePanel data={{ instructions: result.instructions, instructionCount: result.count }} />;

    case 'postfix':
      return (
        <div className="lm-postfix-container">
          <div className="lm-postfix-results">
            <div className="lm-postfix-card"><div className="lm-postfix-label">Infix</div><div className="lm-postfix-value">{result.infix}</div></div>
            <div className="lm-postfix-card lm-postfix-highlight"><div className="lm-postfix-label">Postfix</div><div className="lm-postfix-value">{result.postfix}</div></div>
            <div className="lm-postfix-card"><div className="lm-postfix-label">Prefix</div><div className="lm-postfix-value">{result.prefix}</div></div>
          </div>
          <div className="lm-section-title" style={{ marginTop: 16 }}>Step-by-Step (Shunting-Yard)</div>
          <table className="lm-table">
            <thead><tr><th>Token</th><th>Action</th><th>Output</th><th>Stack</th></tr></thead>
            <tbody>
              {(result.steps || []).map((s, i) => (
                <tr key={i}><td className="lm-mono">{s.token}</td><td>{s.action}</td><td className="lm-mono">{s.output}</td><td className="lm-mono">{s.stack || '(empty)'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'cfg':
      return <CFGPanel data={{ blocks: result.blocks, edges: result.edges }} />;

    case 'optimize':
      return <OptimizationPanel data={result} />;

    default:
      return <pre className="lm-raw-json">{JSON.stringify(result, null, 2)}</pre>;
  }
}

// ============================================================
// MAIN LEARNING MODE COMPONENT
// ============================================================
export default function LearningMode({ onSwitchMode }) {
  const [activeUnit, setActiveUnit] = useState(1);
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [inputs, setInputs] = useState({});
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const modules = MODULES[activeUnit] || [];
  const currentModule = modules[activeModuleIdx] || modules[0];
  const explanation = currentModule ? EXPLANATIONS[currentModule.id] : null;
  const result = currentModule ? results[currentModule.id] : null;

  const getInput = (key) => inputs[key] || '';
  const setInput = (key, val) => setInputs(prev => ({ ...prev, [key]: val }));

  const handleUnitChange = useCallback((unitId) => {
    setActiveUnit(unitId);
    setActiveModuleIdx(0);
  }, []);

  const handleRun = useCallback(async () => {
    if (!currentModule) return;
    setLoading(true);
    try {
      let params = {};
      const mod = currentModule;
      if (mod.inputType === 'code') {
        params = { code: getInput(`${mod.id}-code`) || mod.placeholder };
      } else if (mod.inputType === 'regex') {
        params = { regex: getInput(`${mod.id}-regex`) || mod.placeholder };
      } else if (mod.inputType === 'grammar') {
        params = { grammar: getInput(`${mod.id}-grammar`) || mod.placeholder };
      } else if (mod.inputType === 'grammarAndInput') {
        params = { grammar: getInput(`${mod.id}-grammar`) || mod.grammarPlaceholder, input: getInput(`${mod.id}-input`) || mod.inputPlaceholder };
      } else if (mod.inputType === 'expression') {
        params = { expression: getInput(`${mod.id}-expr`) || mod.placeholder };
      }
      const data = await learningAction(mod.action, params);
      setResults(prev => ({ ...prev, [mod.id]: data }));
    } catch (err) {
      setResults(prev => ({ ...prev, [currentModule.id]: { error: err.message } }));
    }
    setLoading(false);
  }, [currentModule, inputs]);

  const unitColor = UNITS.find(u => u.id === activeUnit)?.color || '#6366f1';

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo">⚡</div>
          <span className="header-title">CodeLens</span>
          <div className="mode-toggle">
            <button className="mode-pill" onClick={onSwitchMode}>⚡ Compiler</button>
            <button className="mode-pill active" style={{ '--pill-color': '#a78bfa' }}>📘 Learning</button>
          </div>
        </div>
      </header>

      {/* Unit Tabs */}
      <div className="lm-unit-bar">
        {UNITS.map(unit => (
          <button key={unit.id} className={`lm-unit-tab ${activeUnit === unit.id ? 'active' : ''}`} onClick={() => handleUnitChange(unit.id)} style={{ '--unit-color': unit.color }}>
            <span className="lm-unit-icon">{unit.icon}</span>
            <span className="lm-unit-label">{unit.label}</span>
            <span className="lm-unit-title">{unit.title}</span>
          </button>
        ))}
      </div>

      {/* Module Selector */}
      <div className="lm-module-bar">
        {modules.map((mod, idx) => (
          <button key={mod.id} className={`lm-module-pill ${activeModuleIdx === idx ? 'active' : ''}`} onClick={() => setActiveModuleIdx(idx)} style={{ '--mod-color': unitColor }}>
            <span>{mod.icon}</span> {mod.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="lm-main">
        {/* Left: Input */}
        <div className="lm-input-panel">
          <div className="lm-input-header">
            <span className="lm-input-title">{currentModule?.icon} Input</span>
            <span className="lm-input-hint">{currentModule?.hint}</span>
          </div>
          <div className="lm-input-body">
            {currentModule?.inputType === 'grammarAndInput' ? (
              <>
                <label className="lm-label">Grammar</label>
                <textarea className="lm-textarea" rows={6} value={getInput(`${currentModule.id}-grammar`)} onChange={e => setInput(`${currentModule.id}-grammar`, e.target.value)} placeholder={currentModule.grammarPlaceholder} spellCheck={false} />
                <label className="lm-label" style={{ marginTop: 10 }}>Input String</label>
                <input className="lm-text-input" value={getInput(`${currentModule.id}-input`)} onChange={e => setInput(`${currentModule.id}-input`, e.target.value)} placeholder={currentModule.inputPlaceholder} spellCheck={false} />
              </>
            ) : currentModule?.inputType === 'expression' ? (
              <>
                <label className="lm-label">Expression</label>
                <input className="lm-text-input" value={getInput(`${currentModule.id}-expr`)} onChange={e => setInput(`${currentModule.id}-expr`, e.target.value)} placeholder={currentModule.placeholder} spellCheck={false} />
              </>
            ) : currentModule?.inputType === 'regex' ? (
              <>
                <label className="lm-label">Regular Expression</label>
                <input className="lm-text-input" value={getInput(`${currentModule.id}-regex`)} onChange={e => setInput(`${currentModule.id}-regex`, e.target.value)} placeholder={currentModule.placeholder} spellCheck={false} />
              </>
            ) : (
              <>
                <label className="lm-label">{currentModule?.inputType === 'grammar' ? 'Grammar' : 'Code'}</label>
                <textarea className="lm-textarea" rows={10} value={getInput(`${currentModule.id}-${currentModule?.inputType === 'grammar' ? 'grammar' : 'code'}`)} onChange={e => setInput(`${currentModule.id}-${currentModule?.inputType === 'grammar' ? 'grammar' : 'code'}`, e.target.value)} placeholder={currentModule?.placeholder} spellCheck={false} />
              </>
            )}
            <button className="btn lm-run-btn" onClick={handleRun} disabled={loading} style={{ '--run-color': unitColor }}>
              {loading ? '⏳ Processing...' : '▶ Run'}
            </button>
          </div>
          {/* Explanation Card */}
          {explanation && (
            <div className="lm-explain-card" style={{ '--ex-color': unitColor }}>
              <div className="lm-explain-title">💡 {explanation.title}</div>
              <div className="lm-explain-text">{explanation.text}</div>
            </div>
          )}
        </div>

        {/* Right: Output */}
        <div className="lm-output-panel">
          {loading ? (
            <div className="loading-overlay"><div className="loading-spinner" /><div className="loading-text">Processing...</div></div>
          ) : result ? (
            <div className="lm-output-content" key={currentModule?.id}>
              {renderResult(currentModule?.id, result)}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">{currentModule?.icon || '📘'}</div>
              <div className="empty-text">Click <strong>"Run"</strong> to see the visualization</div>
              <div className="empty-hint">Or just use the pre-filled example to get started!</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
