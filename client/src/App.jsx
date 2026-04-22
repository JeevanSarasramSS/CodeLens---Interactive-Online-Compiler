import { useState, useCallback, useRef, useEffect } from 'react';
import Header from './components/Header';
import PhaseNavigator from './components/PhaseNavigator';
import CodeEditor, { DEFAULT_CODE } from './components/CodeEditor';
import TokensPanel from './components/TokensPanel';
import ASTPanel from './components/ASTPanel';
import SemanticPanel from './components/SemanticPanel';
import IRCodePanel from './components/IRCodePanel';
import CFGPanel from './components/CFGPanel';
import OutputPanel from './components/OutputPanel';
import ExplanationPanel from './components/ExplanationPanel';
import OptimizationPanel from './components/OptimizationPanel';
import TemplateDrawer from './components/TemplateDrawer';
import StdinInput from './components/StdinInput';
import StatusBar from './components/StatusBar';
import ToastContainer, { useToast } from './components/Toast';
import { runCode, analyzeCode, quickTokenize } from './utils/api';

const TABS = [
  { id: 'lexical', label: 'Tokens', icon: '🔤' },
  { id: 'syntax', label: 'AST', icon: '🌳' },
  { id: 'semantic', label: 'Semantic', icon: '🔍' },
  { id: 'ir', label: 'IR Code', icon: '⚙️' },
  { id: 'cfg', label: 'CFG', icon: '🔀' },
  { id: 'optimize', label: 'Optimize', icon: '🚀' },
  { id: 'output', label: 'Output', icon: '📤' },
  { id: 'explain', label: 'Explain', icon: '💡' },
];

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [activeTab, setActiveTab] = useState('output');
  const [isLoading, setIsLoading] = useState(false);
  const [outputData, setOutputData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [completedPhases, setCompletedPhases] = useState([]);
  const [highlightedToken, setHighlightedToken] = useState(-1);
  const [liveTokens, setLiveTokens] = useState(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [stdinInput, setStdinInput] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [prevTab, setPrevTab] = useState(null);

  const editorRef = useRef(null);
  const debounceRef = useRef(null);
  const { toasts, addToast } = useToast();

  // === Tab switching with animation ===
  const switchTab = useCallback((tabId) => {
    setPrevTab(activeTab);
    setActiveTab(tabId);
  }, [activeTab]);

  // === Live Tokenization — debounced as user types ===
  const handleCodeChange = useCallback((newCode) => {
    setCode(newCode);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await quickTokenize(newCode);
        if (result.tokens) setLiveTokens(result.tokens);
      } catch {
        // Silently fail — live tokenization is a bonus
      }
    }, 350);
  }, []);

  // Initial live tokenization on mount
  useEffect(() => {
    quickTokenize(code).then(r => { if (r.tokens) setLiveTokens(r.tokens); }).catch(() => {});
  }, []);

  // === Keyboard Shortcuts ===
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        handleAnalyze();
      } else if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [code, stdinInput]);

  // === Bidirectional Mapping: Token Click → Editor Highlight ===
  const handleTokenClick = useCallback((token, idx) => {
    setHighlightedToken(idx);
    const editor = editorRef.current;
    if (editor && token.line) {
      editor.revealLineInCenter(token.line);
      editor.setSelection({
        startLineNumber: token.line,
        startColumn: token.column,
        endLineNumber: token.line,
        endColumn: token.column + (token.value?.length || 1),
      });
      editor.focus();
    }
  }, []);

  // === Bidirectional Mapping: Cursor Change → Highlight Token ===
  const handleCursorChange = useCallback((pos) => {
    setCursorPos(pos);
    const tokens = analysisData?.lexical?.tokens || liveTokens;
    if (!tokens) return;
    const idx = tokens.findIndex(t =>
      t.line === pos.line &&
      pos.column >= t.column &&
      pos.column <= t.column + (t.value?.length || 1)
    );
    if (idx !== -1) setHighlightedToken(idx);
  }, [analysisData, liveTokens]);

  // === Run Code ===
  const handleRun = useCallback(async () => {
    setIsLoading(true);
    setStatus('Compiling...');
    switchTab('output');
    try {
      const result = await runCode(code, stdinInput);
      setOutputData(result);
      setStatus(result.success ? 'Compiled successfully' : 'Compilation failed');
      addToast(
        result.success ? `Executed in ${result.executionTime || '?'}` : 'Compilation failed',
        result.success ? 'success' : 'error'
      );
    } catch (err) {
      setOutputData({ success: false, error: `Connection error: ${err.message}`, output: '' });
      setStatus('Connection error');
      addToast('Failed to connect to server', 'error');
    }
    setIsLoading(false);
  }, [code, stdinInput, switchTab, addToast]);

  // === Full Analysis ===
  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setStatus('Analyzing...');
    switchTab('lexical');
    setCompletedPhases([]);
    setAnalysisData(null);

    try {
      const result = await analyzeCode(code);
      if (result.success) {
        setAnalysisData(result.phases);
        // Animate phase completion sequentially
        const phases = ['lexical', 'syntax', 'semantic', 'ir', 'cfg', 'optimize', 'output', 'explain'];
        phases.forEach((phase, i) => {
          setTimeout(() => setCompletedPhases(prev => [...prev, phase]), (i + 1) * 200);
        });
        // Also run the code for the output tab
        const runResult = await runCode(code, stdinInput);
        setOutputData(runResult);
        setStatus('Analysis complete');
        addToast('All compiler phases completed', 'success');
      } else {
        setOutputData({ success: false, error: result.error, output: '' });
        switchTab('output');
        setStatus('Analysis failed');
        addToast('Analysis failed: ' + (result.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      setOutputData({ success: false, error: `Connection error: ${err.message}`, output: '' });
      switchTab('output');
      setStatus('Connection error');
      addToast('Failed to connect to server', 'error');
    }
    setIsLoading(false);
  }, [code, stdinInput, switchTab, addToast]);

  // === Template Selection ===
  const handleSelectTemplate = useCallback((template) => {
    setCode(template.code);
    setAnalysisData(null);
    setOutputData(null);
    setCompletedPhases([]);
    setLiveTokens(null);
    setStatus(`Loaded: ${template.title}`);
    addToast(`Loaded "${template.title}" — ${template.lookFor}`, 'info', 5000);

    // Trigger live tokenization
    setTimeout(async () => {
      try {
        const result = await quickTokenize(template.code);
        if (result.tokens) setLiveTokens(result.tokens);
      } catch {}
    }, 100);
  }, [addToast]);

  const tokenCount = analysisData?.lexical?.tokenCount || (liveTokens?.length ?? null);
  const irCount = analysisData?.ir?.instructionCount;
  const optCount = analysisData?.optimization?.stats?.applied;
  const cfgBlocks = analysisData?.cfg?.blocks?.length;

  return (
    <div className="app-container">
      <Header onOpenTemplates={() => setDrawerOpen(true)} />
      <PhaseNavigator
        activePhase={activeTab}
        completedPhases={completedPhases}
        onPhaseClick={switchTab}
      />
      <div className="main-content">
        <div className="editor-section">
          <CodeEditor
            code={code}
            onCodeChange={handleCodeChange}
            onRun={handleRun}
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
            editorRef={editorRef}
            onCursorChange={handleCursorChange}
          />
          <StdinInput value={stdinInput} onChange={setStdinInput} />
        </div>
        <div className="viz-panel">
          <div className="tab-bar">
            {TABS.map(tab => (
              <div
                key={tab.id}
                className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => switchTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                {tab.label}
                {tab.id === 'lexical' && tokenCount != null && (
                  <span className="tab-badge">{tokenCount}</span>
                )}
                {tab.id === 'ir' && irCount != null && (
                  <span className="tab-badge">{irCount}</span>
                )}
                {tab.id === 'optimize' && optCount != null && (
                  <span className="tab-badge">{optCount}</span>
                )}
                {tab.id === 'cfg' && cfgBlocks != null && (
                  <span className="tab-badge">{cfgBlocks}</span>
                )}
              </div>
            ))}
          </div>
          <div className="tab-content">
            {isLoading ? (
              <div className="loading-overlay">
                <div className="loading-spinner" />
                <div className="loading-text">Processing compilation phases...</div>
              </div>
            ) : (
              <div className="tab-content-inner">
                {activeTab === 'lexical' && (
                  <TokensPanel
                    data={analysisData?.lexical}
                    liveTokens={!analysisData ? liveTokens : null}
                    highlightedToken={highlightedToken}
                    onTokenClick={handleTokenClick}
                  />
                )}
                {activeTab === 'syntax' && <ASTPanel data={analysisData?.syntax} />}
                {activeTab === 'semantic' && <SemanticPanel data={analysisData?.semantic} />}
                {activeTab === 'ir' && <IRCodePanel data={analysisData?.ir} />}
                {activeTab === 'cfg' && <CFGPanel data={analysisData?.cfg} />}
                {activeTab === 'optimize' && <OptimizationPanel data={analysisData?.optimization} />}
                {activeTab === 'output' && <OutputPanel data={outputData} />}
                {activeTab === 'explain' && <ExplanationPanel data={analysisData?.explanations} />}
              </div>
            )}
          </div>
        </div>
      </div>
      <StatusBar
        cursorPos={cursorPos}
        tokenCount={tokenCount}
        irCount={irCount}
        status={status}
      />
      <TemplateDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />
      <ToastContainer toasts={toasts} />
    </div>
  );
}
