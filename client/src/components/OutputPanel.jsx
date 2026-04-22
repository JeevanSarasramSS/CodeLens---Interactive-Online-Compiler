export default function OutputPanel({ data }) {
  if (!data) return (
    <div className="empty-state">
      <div className="empty-icon">📤</div>
      <div className="empty-text">Click <strong>"Run Code"</strong> to compile and execute</div>
      <div className="empty-hint">Uses GCC to compile your C code locally</div>
    </div>
  );

  return (
    <div className="output-terminal">
      {data.error && <div className="output-error">{data.error}</div>}
      {data.output && <div className="output-text">{data.output}</div>}
      {!data.error && !data.output && <div className="output-text">(no output)</div>}
      <div className="output-meta">
        <span>Status: {data.success ? '✅ Success' : '❌ Failed'}</span>
        {data.executionTime && <span>Time: {data.executionTime}</span>}
        {data.phase && <span>Phase: {data.phase}</span>}
      </div>
    </div>
  );
}
