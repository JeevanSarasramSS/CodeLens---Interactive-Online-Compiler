// ============================================================
// LEFT RECURSION REMOVAL — Eliminates direct left recursion
// ============================================================

/**
 * Parse grammar text into structured rules.
 * Input format: "E -> E + T | T" (one production per line)
 */
function parseGrammar(text) {
  const rules = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const match = line.match(/^(\S+)\s*->\s*(.+)$/);
    if (!match) continue;

    const lhs = match[1];
    const alternatives = match[2].split('|').map(a => a.trim());
    rules.push({ lhs, rhs: alternatives });
  }

  return rules;
}

/**
 * Remove direct left recursion from a grammar.
 * A -> Aα₁ | Aα₂ | β₁ | β₂
 * becomes:
 * A  -> β₁A' | β₂A'
 * A' -> α₁A' | α₂A' | ε
 */
function removeLeftRecursion(grammarText) {
  const rules = parseGrammar(grammarText);
  const transformed = [];
  const steps = [];
  let hasChanges = false;

  for (const rule of rules) {
    const { lhs, rhs } = rule;

    // Separate into left-recursive and non-recursive alternatives
    const leftRecursive = [];  // Aα parts
    const nonRecursive = [];   // β parts

    for (const alt of rhs) {
      const tokens = alt.trim().split(/\s+/);
      if (tokens[0] === lhs) {
        leftRecursive.push(tokens.slice(1).join(' '));
      } else {
        nonRecursive.push(alt.trim());
      }
    }

    if (leftRecursive.length === 0) {
      // No left recursion — keep as-is
      transformed.push({ lhs, rhs, changed: false });
      steps.push({
        type: 'info',
        message: `${lhs} → ${rhs.join(' | ')} — no left recursion detected`
      });
    } else {
      hasChanges = true;
      const newNT = lhs + "'";

      steps.push({
        type: 'detect',
        message: `Found left recursion in ${lhs}: ${leftRecursive.map(a => `${lhs} → ${lhs} ${a}`).join(', ')}`
      });

      // Build new A rule: β₁A' | β₂A'
      const newRhs = nonRecursive.map(beta => {
        return beta === 'ε' || beta === 'epsilon' ? newNT : `${beta} ${newNT}`;
      });

      if (nonRecursive.length === 0) {
        newRhs.push(newNT);
      }

      transformed.push({ lhs, rhs: newRhs, changed: true });

      steps.push({
        type: 'transform',
        message: `${lhs} → ${newRhs.join(' | ')}`
      });

      // Build A' rule: α₁A' | α₂A' | ε
      const primeRhs = leftRecursive.map(alpha => `${alpha} ${newNT}`);
      primeRhs.push('ε');

      transformed.push({ lhs: newNT, rhs: primeRhs, changed: true });

      steps.push({
        type: 'transform',
        message: `${newNT} → ${primeRhs.join(' | ')}`
      });
    }
  }

  return {
    original: rules,
    transformed,
    steps,
    hasChanges,
    originalText: grammarText.trim(),
    transformedText: transformed.map(r => `${r.lhs} -> ${r.rhs.join(' | ')}`).join('\n')
  };
}

module.exports = { removeLeftRecursion, parseGrammar };
