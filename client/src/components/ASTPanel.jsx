import ASTTreeCanvas from './ASTTreeCanvas';

export default function ASTPanel({ data }) {
  if (!data || !data.ast) return (
    <div className="empty-state">
      <div className="empty-icon">🌳</div>
      <div className="empty-text">Click <strong>"Run with Compilation Steps"</strong> to generate the AST</div>
      <div className="empty-hint">The parser builds a tree structure from your tokens</div>
    </div>
  );

  return (
    <div className="ast-panel-wrapper">
      <ASTTreeCanvas ast={data.ast} />
      {data.errors && data.errors.length > 0 && (
        <div className="semantic-messages" style={{ marginTop: 12, padding: '0 16px' }}>
          {data.errors.map((e, i) => (
            <div key={i} className="semantic-msg error">⚠️ {e}</div>
          ))}
        </div>
      )}
    </div>
  );
}
