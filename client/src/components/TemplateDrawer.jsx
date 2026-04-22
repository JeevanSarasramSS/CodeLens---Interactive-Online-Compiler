import { useState } from 'react';
import codeTemplates, { CATEGORIES } from '../data/codeTemplates';

export default function TemplateDrawer({ isOpen, onClose, onSelectTemplate }) {
  const [activeCategory, setActiveCategory] = useState('Basics');
  const [hoveredId, setHoveredId] = useState(null);

  const filtered = codeTemplates.filter(t => t.category === activeCategory);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`template-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-title">
            <span className="drawer-title-icon">📚</span>
            <span>Code Examples</span>
          </div>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-subtitle">
          Pick an example to explore how the compiler processes different code patterns.
        </div>

        {/* Category Pills */}
        <div className="category-pills">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`category-pill ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Template Cards */}
        <div className="template-list">
          {filtered.map(template => (
            <div
              key={template.id}
              className={`template-card ${hoveredId === template.id ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => {
                onSelectTemplate(template);
                onClose();
              }}
            >
              <div className="template-card-header">
                <span className="template-card-icon">{template.icon}</span>
                <span className="template-card-title">{template.title}</span>
              </div>
              <p className="template-card-desc">{template.description}</p>
              <div className="template-card-hint">
                <span className="hint-icon">🔍</span>
                <span>{template.lookFor}</span>
              </div>
              <div className="template-card-action">
                <span>Load Example</span>
                <span className="action-arrow">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
