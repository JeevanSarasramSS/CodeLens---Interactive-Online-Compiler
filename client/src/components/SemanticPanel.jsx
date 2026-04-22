export default function SemanticPanel({ data }) {
  if (!data) return (
    <div className="empty-state">
      <div className="empty-icon">🔍</div>
      <div className="empty-text">Click <strong>"Run with Compilation Steps"</strong> to run semantic analysis</div>
      <div className="empty-hint">Checks for undeclared variables, type issues, and more</div>
    </div>
  );

  const { symbolTable, warnings, errors } = data;

  return (
    <div>
      <h3 style={{ fontSize: 13, color: '#6366f1', marginBottom: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
        📋 Symbol Table ({symbolTable.length} entries)
      </h3>
      {symbolTable.length > 0 && (
        <table className="symbol-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Scope</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {symbolTable.map((sym, i) => (
              <tr key={i}>
                <td style={{ color: '#c084fc' }}>{sym.name}</td>
                <td style={{ color: '#6366f1' }}>{sym.type}</td>
                <td>{sym.scope}</td>
                <td>
                  <span className={`status-badge ${sym.initialized ? 'ok' : 'warn'}`}>
                    {sym.initialized ? '✓ initialized' : '⚠ uninitialized'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(errors.length > 0 || warnings.length > 0) && (
        <div className="semantic-messages">
          {errors.map((e, i) => (
            <div key={`e${i}`} className="semantic-msg error">
              ❌ <span>{e.message} {e.line ? `(line ${e.line})` : ''}</span>
            </div>
          ))}
          {warnings.map((w, i) => (
            <div key={`w${i}`} className="semantic-msg warning">
              ⚠️ <span>{w.message} {w.line ? `(line ${w.line})` : ''}</span>
            </div>
          ))}
        </div>
      )}

      {errors.length === 0 && warnings.length === 0 && (
        <div className="semantic-msg" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', marginTop: 12 }}>
          ✅ No semantic errors or warnings detected
        </div>
      )}
    </div>
  );
}
