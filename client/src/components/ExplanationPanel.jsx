export default function ExplanationPanel({ data }) {
  if (!data) return (
    <div className="empty-state">
      <div className="empty-icon">💡</div>
      <div className="empty-text">Click <strong>"Run with Compilation Steps"</strong> to see explanations</div>
      <div className="empty-hint">Dynamic, code-specific explanations for each compiler phase</div>
    </div>
  );

  const { tokens: tokenExpl, ast: astExpl, semantic: semExpl, ir: irExpl } = data;

  return (
    <div>
      {tokenExpl && tokenExpl.length > 0 && (
        <div className="explanation-section">
          <div className="explanation-section-title">🔤 Lexical Analysis Insights</div>
          <div className="explanation-list">
            {tokenExpl.map((e, i) => (
              <div key={i} className="explanation-item" style={{ animationDelay: `${i * 40}ms` }}>
                {e.explanation}
              </div>
            ))}
          </div>
        </div>
      )}

      {astExpl && astExpl.length > 0 && (
        <div className="explanation-section">
          <div className="explanation-section-title">🌳 Syntax Tree Insights</div>
          <div className="explanation-list">
            {astExpl.map((e, i) => (
              <div key={i} className="explanation-item">{e.explanation}</div>
            ))}
          </div>
        </div>
      )}

      {semExpl && semExpl.length > 0 && (
        <div className="explanation-section">
          <div className="explanation-section-title">🔍 Semantic Analysis Insights</div>
          <div className="explanation-list">
            {semExpl.map((e, i) => (
              <div key={i} className={`explanation-item ${e.type === 'error' ? 'error-item' : ''} ${e.type === 'warning' ? 'warning-item' : ''}`}>
                {e.explanation}
              </div>
            ))}
          </div>
        </div>
      )}

      {irExpl && irExpl.length > 0 && (
        <div className="explanation-section">
          <div className="explanation-section-title">⚙️ Intermediate Code Insights</div>
          <div className="explanation-list">
            {irExpl.map((e, i) => (
              <div key={i} className="explanation-item">
                <code>{e.instruction}</code> → {e.explanation}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
