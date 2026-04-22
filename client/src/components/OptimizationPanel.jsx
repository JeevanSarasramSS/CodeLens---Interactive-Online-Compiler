export default function OptimizationPanel({ data }) {
  if (!data) return (
    <div className="empty-state">
      <div className="empty-icon">🔧</div>
      <div className="empty-text">Click <strong>"Run with Compilation Steps"</strong> to see optimizations</div>
      <div className="empty-hint">Constant folding, dead code elimination, copy propagation, strength reduction</div>
    </div>
  );

  const { original, optimized, optimizations, stats } = data;

  return (
    <div>
      {/* Stats Bar */}
      <div className="opt-stats-bar">
        <div className="opt-stat">
          <span className="opt-stat-label">Original</span>
          <span className="opt-stat-value">{stats.originalCount} instructions</span>
        </div>
        <div className="opt-stat-arrow">→</div>
        <div className="opt-stat">
          <span className="opt-stat-label">Optimized</span>
          <span className="opt-stat-value opt-green">{stats.optimizedCount} instructions</span>
        </div>
        <div className="opt-stat">
          <span className="opt-stat-label">Removed</span>
          <span className="opt-stat-value opt-red">{stats.removed}</span>
        </div>
        <div className="opt-stat">
          <span className="opt-stat-label">Optimizations</span>
          <span className="opt-stat-value opt-blue">{stats.applied}</span>
        </div>
      </div>

      {/* Optimizations Applied */}
      {optimizations.length > 0 ? (
        <div className="opt-list">
          <h3 className="opt-section-title">🔧 Optimizations Applied</h3>
          {optimizations.map((opt, i) => (
            <div key={i} className={`opt-card opt-type-${opt.type.toLowerCase().replace(/\s+/g, '-')}`} style={{ animationDelay: `${i * 80}ms` }}>
              <div className="opt-card-header">
                <span className="opt-card-icon">{opt.icon}</span>
                <span className="opt-card-type">{opt.type}</span>
              </div>
              <p className="opt-card-desc">{opt.description}</p>
              <div className="opt-diff">
                <div className="opt-diff-line opt-diff-remove">
                  <span className="opt-diff-marker">−</span>
                  <code>{opt.before}</code>
                </div>
                <div className="opt-diff-line opt-diff-add">
                  <span className="opt-diff-marker">+</span>
                  <code>{opt.after}</code>
                </div>
              </div>
              <div className="opt-saving">💡 {opt.saving}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="opt-no-opts">
          <span>✅</span> Code is already well-optimized — no further improvements found
        </div>
      )}

      {/* Side by Side IR */}
      <div className="opt-comparison">
        <div className="opt-col">
          <h3 className="opt-col-title opt-col-before">📄 Original IR ({original.length})</h3>
          <div className="ir-code">
            {original.map((inst, i) => (
              <div key={i} className="ir-line">
                <span className="ir-line-num">{i + 1}</span>
                <span className="ir-instruction">{inst.instruction}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="opt-col">
          <h3 className="opt-col-title opt-col-after">⚡ Optimized IR ({optimized.length})</h3>
          <div className="ir-code">
            {optimized.map((inst, i) => (
              <div key={i} className={`ir-line ${inst._optimized ? 'ir-optimized' : ''}`}>
                <span className="ir-line-num">{i + 1}</span>
                <span className="ir-instruction">{inst.instruction}</span>
                {inst._optimized && <span className="ir-opt-badge">{inst._optimized}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
