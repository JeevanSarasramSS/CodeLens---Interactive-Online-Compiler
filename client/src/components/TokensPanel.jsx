const TYPE_COLORS = {
  KEYWORD: '#6366f1', IDENTIFIER: '#c084fc', INT_LITERAL: '#34d399',
  FLOAT_LITERAL: '#34d399', STRING_LITERAL: '#fbbf24', CHAR_LITERAL: '#fbbf24',
  OPERATOR: '#f87171', PUNCTUATION: '#94a3b8', COMMENT: '#475569', PREPROCESSOR: '#818cf8'
};

export default function TokensPanel({ data, liveTokens, highlightedToken, onTokenClick }) {
  const tokens = data?.tokens || liveTokens || null;
  const summary = data?.summary || (liveTokens ? buildSummary(liveTokens) : null);
  const isLive = !data && liveTokens;

  if (!tokens) return (
    <div className="empty-state">
      <div className="empty-icon">🔤</div>
      <div className="empty-text">Click <strong>"Run with Compilation Steps"</strong> to see tokens</div>
      <div className="empty-hint">Or just start typing — live tokenization is active!</div>
    </div>
  );

  const total = tokens.length;
  const maxCount = summary ? Math.max(...Object.values(summary)) : 1;

  return (
    <div>
      {isLive && (
        <div className="live-indicator" style={{ marginBottom: 12 }}>
          <span className="live-dot" />
          <span>Live Tokenization — {tokens.length} tokens</span>
        </div>
      )}

      {summary && (
        <div className="token-summary">
          {Object.entries(summary).map(([type, count]) => (
            <div className="summary-item" key={type}>
              <span className="summary-dot" style={{ background: TYPE_COLORS[type] || '#666' }} />
              <span>{type}: <strong>{count}</strong></span>
            </div>
          ))}
        </div>
      )}

      {/* Token Frequency Chart */}
      {summary && (
        <div className="freq-chart">
          <div className="freq-chart-title">📊 Token Distribution</div>
          {Object.entries(summary)
            .sort(([,a], [,b]) => b - a)
            .map(([type, count]) => (
              <div className="freq-bar-row" key={type}>
                <span className="freq-bar-label">{type}</span>
                <div className="freq-bar-track">
                  <div
                    className="freq-bar-fill"
                    style={{
                      width: `${(count / total) * 100}%`,
                      background: `${TYPE_COLORS[type] || '#666'}aa`,
                      minWidth: 24,
                    }}
                  >
                    {count}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      <div style={{ marginTop: 16 }} />

      <div className="token-grid">
        {tokens.map((token, i) => (
          <div
            key={`${i}-${token.value}`}
            className={`token-chip ${token.type} ${highlightedToken === i ? 'highlighted' : ''}`}
            style={{ animationDelay: `${Math.min(i * 15, 600)}ms` }}
            onClick={() => onTokenClick && onTokenClick(token, i)}
            title={`Line ${token.line}, Col ${token.column} — ${token.type}`}
          >
            <span className="token-type-badge">{token.type.slice(0, 3)}</span>
            <span>{token.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildSummary(tokens) {
  const counts = {};
  tokens.forEach(t => { counts[t.type] = (counts[t.type] || 0) + 1; });
  return counts;
}
