export default function StatusBar({ cursorPos, tokenCount, irCount, status }) {
  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-item">
          <span className="status-dot status-dot-ok" />
          {status || 'Ready'}
        </span>
      </div>
      <div className="status-right">
        {tokenCount != null && (
          <span className="status-item">🔤 {tokenCount} tokens</span>
        )}
        {irCount != null && (
          <span className="status-item">⚙️ {irCount} IR</span>
        )}
        <span className="status-item">
          Ln {cursorPos.line}, Col {cursorPos.column}
        </span>
        <span className="status-item status-lang">C</span>
      </div>
    </div>
  );
}
