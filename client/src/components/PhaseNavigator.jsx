const PHASES = [
  { id: 'lexical', label: 'Lexical Analysis', icon: '🔤' },
  { id: 'syntax', label: 'Syntax Tree', icon: '🌳' },
  { id: 'semantic', label: 'Semantic Check', icon: '🔍' },
  { id: 'ir', label: 'IR Code', icon: '⚙️' },
  { id: 'cfg', label: 'Control Flow', icon: '🔀' },
  { id: 'optimize', label: 'Optimization', icon: '🚀' },
  { id: 'output', label: 'Output', icon: '📤' },
  { id: 'explain', label: 'Explanations', icon: '💡' },
];

export default function PhaseNavigator({ activePhase, completedPhases, onPhaseClick }) {
  return (
    <nav className="phase-nav">
      {PHASES.map((phase, i) => (
        <div key={phase.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            className={`phase-step ${activePhase === phase.id ? 'active' : ''} ${completedPhases.includes(phase.id) ? 'completed' : ''}`}
            onClick={() => onPhaseClick(phase.id)}
          >
            <span className="phase-dot" />
            <span>{phase.icon} {phase.label}</span>
          </div>
          {i < PHASES.length - 1 && (
            <div className={`phase-connector ${completedPhases.includes(phase.id) ? 'active' : ''}`} />
          )}
        </div>
      ))}
    </nav>
  );
}
