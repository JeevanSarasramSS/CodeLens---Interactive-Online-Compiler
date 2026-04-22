export default function IRCodePanel({ data }) {
  if (!data) return (
    <div className="empty-state">
      <div className="empty-icon">⚙️</div>
      <div className="empty-text">Click <strong>"Run with Compilation Steps"</strong> to generate intermediate code</div>
      <div className="empty-hint">Three Address Code (TAC) — a simplified representation used by compilers</div>
    </div>
  );

  const { instructions, instructionCount } = data;

  return (
    <div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
        Generated <strong style={{ color: '#22d3ee' }}>{instructionCount}</strong> instructions
      </div>
      <div className="ir-code">
        {instructions.map((inst, i) => (
          <div key={i} className="ir-line" style={{ animationDelay: `${i * 30}ms` }}>
            <span className="ir-line-num">{inst.line || i + 1}</span>
            <span className="ir-instruction">{inst.instruction}</span>
            {inst.comment && <span className="ir-comment">// {inst.comment}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
