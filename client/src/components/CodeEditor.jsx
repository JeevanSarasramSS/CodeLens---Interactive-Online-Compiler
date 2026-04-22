import { useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';

const DEFAULT_CODE = `#include <stdio.h>

int main() {
    int a = 5;
    int b = 10;
    int sum = a + b;

    if (sum > 10) {
        printf("Sum is greater than 10\\n");
    } else {
        printf("Sum is 10 or less\\n");
    }

    for (int i = 0; i < 3; i++) {
        printf("i = %d\\n", i);
    }

    return 0;
}`;

export default function CodeEditor({ code, onCodeChange, onRun, onAnalyze, isLoading, editorRef, onCursorChange }) {
  const monacoRef = useRef(null);

  const handleEditorDidMount = useCallback((editor, monaco) => {
    monacoRef.current = monaco;
    if (editorRef) editorRef.current = editor;

    // Track cursor position for bidirectional mapping
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        onCursorChange({ line: e.position.lineNumber, column: e.position.column });
      }
    });
  }, [editorRef, onCursorChange]);

  return (
    <div className="editor-panel">
      <div className="editor-header">
        <div className="editor-file-tab">
          <span className="editor-file-dot dot-c" />
          main.c
        </div>
        <div className="live-indicator">
          <span className="live-dot" />
          <span>Live Analysis</span>
        </div>
      </div>
      <div className="editor-wrapper">
        <Editor
          height="100%"
          defaultLanguage="c"
          theme="vs-dark"
          value={code ?? DEFAULT_CODE}
          onChange={(val) => onCodeChange(val || '')}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
            minimap: { enabled: false },
            padding: { top: 12 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            renderLineHighlight: 'all',
            lineNumbersMinChars: 3,
            glyphMargin: false,
            automaticLayout: true,
          }}
        />
      </div>
      <div className="editor-actions">
        <button className="btn btn-run" onClick={onRun} disabled={isLoading}>
          <span className="btn-icon">▶</span> Run Code
        </button>
        <button className="btn btn-analyze" onClick={onAnalyze} disabled={isLoading}>
          <span className="btn-icon">🔬</span> Run with Compilation Steps
        </button>
      </div>
    </div>
  );
}

export { DEFAULT_CODE };
