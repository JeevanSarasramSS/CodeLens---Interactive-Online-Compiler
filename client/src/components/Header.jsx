export default function Header({ onOpenTemplates }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-logo">⚡</div>
        <span className="header-title">CodeLens — Interactive Compiler Platform</span>
        <span className="header-badge">Compiler Design</span>
      </div>
      <div className="header-right">
        <button className="btn btn-templates" onClick={onOpenTemplates}>
          <span className="btn-icon">📚</span> Examples
        </button>
        <div className="header-shortcuts-hint">
          <kbd>Ctrl</kbd>+<kbd>Enter</kbd> Run &nbsp;|&nbsp; <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd> Analyze
        </div>
      </div>
    </header>
  );
}
