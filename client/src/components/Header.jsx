export default function Header({ onOpenTemplates, appMode, onSwitchMode }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-logo">⚡</div>
        <span className="header-title">CodeLens — Interactive Compiler Platform</span>
        <span className="header-badge">Compiler Design</span>
        <div className="mode-toggle">
          <button
            className={`mode-pill ${appMode === 'compiler' ? 'active' : ''}`}
            onClick={() => onSwitchMode('compiler')}
            style={{ '--pill-color': '#6366f1' }}
          >⚡ Compiler</button>
          <button
            className={`mode-pill ${appMode === 'learning' ? 'active' : ''}`}
            onClick={() => onSwitchMode('learning')}
            style={{ '--pill-color': '#a78bfa' }}
          >📘 Learning</button>
        </div>
      </div>
      <div className="header-right">
        {appMode === 'compiler' && (
          <>
            <button className="btn btn-templates" onClick={onOpenTemplates}>
              <span className="btn-icon">📚</span> Examples
            </button>
            <div className="header-shortcuts-hint">
              <kbd>Ctrl</kbd>+<kbd>Enter</kbd> Run &nbsp;|&nbsp; <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd> Analyze
            </div>
          </>
        )}
      </div>
    </header>
  );
}
