import { useState } from 'react';

export default function StdinInput({ value, onChange }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`stdin-panel ${expanded ? 'expanded' : ''}`}>
      <div className="stdin-header" onClick={() => setExpanded(!expanded)}>
        <div className="stdin-label">
          <span className="stdin-icon">⌨️</span>
          <span>Program Input (stdin)</span>
        </div>
        <span className={`stdin-chevron ${expanded ? 'open' : ''}`}>▾</span>
      </div>
      {expanded && (
        <textarea
          className="stdin-textarea"
          placeholder="Enter input for your program here (e.g., values for scanf)..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          spellCheck={false}
        />
      )}
    </div>
  );
}
