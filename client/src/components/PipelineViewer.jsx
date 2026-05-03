import { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
import TokensPanel from './TokensPanel';
import ASTPanel from './ASTPanel';
import SemanticPanel from './SemanticPanel';
import IRCodePanel from './IRCodePanel';
import CFGPanel from './CFGPanel';
import OptimizationPanel from './OptimizationPanel';
import OutputPanel from './OutputPanel';

// ============================================================
// PHASE DEFINITIONS — order, metadata, explanations
// ============================================================
const PHASES = [
  {
    id: 'lexical',
    label: 'Lexical Analysis',
    shortLabel: 'Tokens',
    icon: '🔤',
    color: '#6366f1',
    explanation: {
      title: 'Lexical Analysis (Tokenization)',
      what: 'The lexer scans the raw source code character by character and groups them into meaningful units called tokens.',
      why: 'Tokens are the smallest meaningful elements — keywords, identifiers, operators, literals. This step strips away whitespace and comments.',
      analogy: 'Think of it like breaking a sentence into individual words and punctuation marks.',
    },
    transformation: {
      from: 'Raw Source Code',
      to: 'Stream of Tokens',
      description: 'Each character sequence is classified: `int` becomes a KEYWORD token, `sum` becomes an IDENTIFIER, `+` becomes an OPERATOR.',
    },
  },
  {
    id: 'syntax',
    label: 'Syntax Analysis',
    shortLabel: 'AST',
    icon: '🌳',
    color: '#a78bfa',
    explanation: {
      title: 'Syntax Analysis (Parsing)',
      what: 'The parser reads the token stream and builds an Abstract Syntax Tree (AST) — a hierarchical representation of the program\'s structure.',
      why: 'The AST captures the grammatical structure: which expressions belong to which statements, how blocks are nested, and operator precedence.',
      analogy: 'Like diagramming a sentence — identifying the subject, verb, and object, and how clauses relate to each other.',
    },
    transformation: {
      from: 'Stream of Tokens',
      to: 'Abstract Syntax Tree',
      description: 'Flat token sequence is organized into a tree. For example, tokens `a`, `+`, `b` become a BinaryExpression node with two Identifier children.',
    },
  },
  {
    id: 'semantic',
    label: 'Semantic Analysis',
    shortLabel: 'Semantic',
    icon: '🔍',
    color: '#10b981',
    explanation: {
      title: 'Semantic Analysis',
      what: 'The semantic analyzer walks the AST to check for meaning-level correctness: variable declarations, type compatibility, scope rules.',
      why: 'Syntax can be correct but semantically wrong — like using an undeclared variable or adding a string to an integer.',
      analogy: 'Like proofreading a grammatically correct sentence to check if it actually makes sense.',
    },
    transformation: {
      from: 'Abstract Syntax Tree',
      to: 'Annotated AST + Symbol Table',
      description: 'The AST is enriched with type information and a symbol table is built, tracking every variable\'s type, scope, and usage status.',
    },
  },
  {
    id: 'ir',
    label: 'IR Generation',
    shortLabel: 'IR Code',
    icon: '⚙️',
    color: '#22d3ee',
    explanation: {
      title: 'Intermediate Code Generation',
      what: 'The compiler translates the AST into Three-Address Code (3AC) — a low-level, machine-independent representation.',
      why: '3AC simplifies complex expressions into simple operations with at most three operands, making optimization and code generation easier.',
      analogy: 'Like translating a complex recipe into a numbered list of simple, atomic steps.',
    },
    transformation: {
      from: 'Annotated AST',
      to: 'Three-Address Code (3AC)',
      description: 'Tree nodes become linear instructions. `sum = a + b` might become: `t1 = a`, `t2 = b`, `t3 = t1 + t2`, `sum = t3`.',
    },
  },
  {
    id: 'cfg',
    label: 'Control Flow',
    shortLabel: 'CFG',
    icon: '🔀',
    color: '#f59e0b',
    explanation: {
      title: 'Control Flow Graph (CFG)',
      what: 'The IR instructions are grouped into basic blocks — sequences of straight-line code with no jumps. These blocks are connected by edges showing all possible execution paths.',
      why: 'The CFG reveals the program\'s control structure: loops, branches, and function boundaries — essential for optimization.',
      analogy: 'Like a flowchart showing every possible path the program could take during execution.',
    },
    transformation: {
      from: 'Linear IR Instructions',
      to: 'Graph of Basic Blocks',
      description: 'Sequential IR is split at jump targets and branch points. Edges connect blocks based on conditionals, loops, and fall-through paths.',
    },
  },
  {
    id: 'optimize',
    label: 'Optimization',
    shortLabel: 'Optimize',
    icon: '🚀',
    color: '#f43f5e',
    explanation: {
      title: 'Code Optimization',
      what: 'The optimizer applies transformations to the IR to make the program faster or smaller without changing its behavior.',
      why: 'Techniques like constant folding, dead code elimination, copy propagation, and strength reduction improve runtime performance.',
      analogy: 'Like an editor shortening a paragraph without losing meaning — removing redundancy and simplifying.',
    },
    transformation: {
      from: 'Unoptimized IR',
      to: 'Optimized IR',
      description: 'Before/after comparison shows exactly which instructions were removed, simplified, or replaced with more efficient alternatives.',
    },
  },
  {
    id: 'output',
    label: 'Final Output',
    shortLabel: 'Output',
    icon: '📤',
    color: '#10b981',
    explanation: {
      title: 'Code Generation & Execution',
      what: 'The final optimized code is compiled to machine code by the target compiler (GCC) and executed to produce the program output.',
      why: 'This is the end goal — all previous phases worked together to transform source code into a running program.',
      analogy: 'The final dish served after all the prep work in the kitchen.',
    },
    transformation: {
      from: 'Optimized IR / Machine Code',
      to: 'Program Output',
      description: 'The compiler backend translates the optimized representation into executable machine instructions. The program runs and produces its output.',
    },
  },
];

// ============================================================
// PHASE CONTENT RENDERER — reuses existing panels
// ============================================================
const PhaseContent = memo(function PhaseContent({ phaseId, data, outputData }) {
  switch (phaseId) {
    case 'lexical':
      return <TokensPanel data={data?.lexical} liveTokens={null} highlightedToken={-1} onTokenClick={null} />;
    case 'syntax':
      return <ASTPanel data={data?.syntax} />;
    case 'semantic':
      return <SemanticPanel data={data?.semantic} />;
    case 'ir':
      return <IRCodePanel data={data?.ir} />;
    case 'cfg':
      return <CFGPanel data={data?.cfg} />;
    case 'optimize':
      return <OptimizationPanel data={data?.optimization} />;
    case 'output':
      return <OutputPanel data={outputData || data?.output} />;
    default:
      return null;
  }
});

// ============================================================
// PROGRESS BAR
// ============================================================
const WalkthroughProgress = memo(function WalkthroughProgress({ currentStep, totalSteps, phases, onStepClick }) {
  return (
    <div className="wt-progress">
      {phases.map((phase, i) => {
        const isActive = i === currentStep;
        const isCompleted = i < currentStep;
        const isPending = i > currentStep;
        return (
          <div key={phase.id} className="wt-progress-step-wrapper">
            <button
              className={`wt-progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isPending ? 'pending' : ''}`}
              onClick={() => onStepClick(i)}
              style={{ '--phase-color': phase.color }}
            >
              <span className="wt-step-icon">{phase.icon}</span>
              <span className="wt-step-label">{phase.shortLabel}</span>
              {isCompleted && <span className="wt-step-check">✓</span>}
            </button>
            {i < phases.length - 1 && (
              <div className={`wt-progress-connector ${isCompleted ? 'completed' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
});

// ============================================================
// EXPLANATION PANEL
// ============================================================
const ExplanationCard = memo(function ExplanationCard({ phase, stats }) {
  const { explanation, transformation } = phase;

  return (
    <div className="wt-explanation" style={{ '--phase-color': phase.color }}>
      <div className="wt-explanation-header">
        <span className="wt-explanation-icon">{phase.icon}</span>
        <h3 className="wt-explanation-title">{explanation.title}</h3>
        <span className="wt-phase-number">Phase {PHASES.indexOf(phase) + 1} of {PHASES.length}</span>
      </div>

      <div className="wt-explanation-body">
        <div className="wt-explain-section">
          <div className="wt-explain-label">What happens</div>
          <p className="wt-explain-text">{explanation.what}</p>
        </div>
        <div className="wt-explain-section">
          <div className="wt-explain-label">Why it matters</div>
          <p className="wt-explain-text">{explanation.why}</p>
        </div>
        <div className="wt-explain-section">
          <div className="wt-explain-label">💡 Analogy</div>
          <p className="wt-explain-text wt-explain-analogy">{explanation.analogy}</p>
        </div>
      </div>

      <div className="wt-transformation">
        <div className="wt-transform-from">
          <span className="wt-transform-dot" />
          {transformation.from}
        </div>
        <div className="wt-transform-arrow">→</div>
        <div className="wt-transform-to">
          <span className="wt-transform-dot" />
          {transformation.to}
        </div>
      </div>
      <p className="wt-transform-desc">{transformation.description}</p>

      {stats && (
        <div className="wt-stats">
          {stats.map((s, i) => (
            <div key={i} className="wt-stat-chip">
              <span className="wt-stat-value">{s.value}</span>
              <span className="wt-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ============================================================
// MAIN PIPELINE VIEWER COMPONENT
// ============================================================
export default function PipelineViewer({ data, outputData, onExit }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [direction, setDirection] = useState('forward'); // for animation direction
  const intervalRef = useRef(null);

  const currentPhase = PHASES[currentStep];
  const totalSteps = PHASES.length;

  // Compute stats for the current phase
  const phaseStats = useMemo(() => {
    if (!data) return null;
    switch (currentPhase.id) {
      case 'lexical':
        return [
          { value: data.lexical?.tokenCount || 0, label: 'tokens' },
          { value: Object.keys(data.lexical?.summary || {}).length, label: 'types' },
        ];
      case 'syntax':
        return [
          { value: data.syntax?.errors?.length === 0 ? '✓' : data.syntax?.errors?.length, label: data.syntax?.errors?.length === 0 ? 'no errors' : 'parse errors' },
        ];
      case 'semantic':
        return [
          { value: data.semantic?.symbolTable?.length || 0, label: 'symbols' },
          { value: data.semantic?.warnings?.length || 0, label: 'warnings' },
          { value: data.semantic?.errors?.length || 0, label: 'errors' },
        ];
      case 'ir':
        return [
          { value: data.ir?.instructionCount || 0, label: 'instructions' },
        ];
      case 'cfg':
        return [
          { value: data.cfg?.blocks?.length || 0, label: 'basic blocks' },
          { value: data.cfg?.edges?.length || 0, label: 'edges' },
        ];
      case 'optimize':
        return [
          { value: data.optimization?.stats?.applied || 0, label: 'optimizations' },
          { value: data.optimization?.stats?.removed || 0, label: 'removed' },
        ];
      case 'output': {
        const out = outputData || data.output;
        return [
          { value: out?.success ? '✓' : '✗', label: out?.success ? 'success' : 'failed' },
          ...(out?.executionTime ? [{ value: out.executionTime, label: 'exec time' }] : []),
        ];
      }
      default:
        return null;
    }
  }, [currentStep, data, outputData, currentPhase.id]);

  // Navigation
  const goNext = useCallback(() => {
    setDirection('forward');
    setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  const goPrev = useCallback(() => {
    setDirection('backward');
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback((step) => {
    setDirection(step > currentStep ? 'forward' : 'backward');
    setCurrentStep(step);
  }, [currentStep]);

  // Auto-play
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            return prev;
          }
          setDirection('forward');
          return prev + 1;
        });
      }, 3500);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, totalSteps]);

  const togglePlay = useCallback(() => {
    if (currentStep >= totalSteps - 1) {
      setCurrentStep(0);
      setDirection('forward');
      setIsPlaying(true);
    } else {
      setIsPlaying(prev => !prev);
    }
  }, [currentStep, totalSteps]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goNext();
        setIsPlaying(false);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goPrev();
        setIsPlaying(false);
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, togglePlay, onExit]);

  return (
    <div className="wt-container">
      {/* Progress Bar */}
      <WalkthroughProgress
        currentStep={currentStep}
        totalSteps={totalSteps}
        phases={PHASES}
        onStepClick={(i) => { goToStep(i); setIsPlaying(false); }}
      />

      {/* Main Content */}
      <div className="wt-main">
        {/* Phase Visual Output */}
        <div className="wt-visual">
          <div className="wt-visual-header">
            <span className="wt-visual-icon" style={{ color: currentPhase.color }}>{currentPhase.icon}</span>
            <span className="wt-visual-title">{currentPhase.label}</span>
            <span className="wt-visual-badge" style={{ background: `${currentPhase.color}22`, color: currentPhase.color, borderColor: `${currentPhase.color}44` }}>
              Phase {currentStep + 1}/{totalSteps}
            </span>
          </div>
          <div className={`wt-visual-content wt-anim-${direction}`} key={currentStep}>
            <PhaseContent
              phaseId={currentPhase.id}
              data={data}
              outputData={outputData}
            />
          </div>
        </div>

        {/* Explanation Panel */}
        <div className={`wt-sidebar wt-anim-${direction}`} key={`explain-${currentStep}`}>
          <ExplanationCard
            phase={currentPhase}
            stats={phaseStats}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="wt-controls">
        <div className="wt-controls-left">
          <button className="btn wt-btn-exit" onClick={onExit}>
            ✕ Exit Walkthrough
          </button>
        </div>
        <div className="wt-controls-center">
          <button
            className="btn wt-btn-nav"
            onClick={() => { goPrev(); setIsPlaying(false); }}
            disabled={currentStep === 0}
          >
            ⬅ Previous
          </button>
          <button
            className={`btn wt-btn-play ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlay}
          >
            {isPlaying ? '⏸ Pause' : (currentStep >= totalSteps - 1 ? '↺ Replay' : '▶ Auto Play')}
          </button>
          <button
            className="btn wt-btn-nav"
            onClick={() => { goNext(); setIsPlaying(false); }}
            disabled={currentStep >= totalSteps - 1}
          >
            Next ➡
          </button>
        </div>
        <div className="wt-controls-right">
          <span className="wt-kbd-hint">
            <kbd>←</kbd><kbd>→</kbd> Navigate &nbsp; <kbd>Space</kbd> Play &nbsp; <kbd>Esc</kbd> Exit
          </span>
        </div>
      </div>
    </div>
  );
}
