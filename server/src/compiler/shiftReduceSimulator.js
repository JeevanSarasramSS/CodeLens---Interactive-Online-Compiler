// ============================================================
// SHIFT-REDUCE PARSER SIMULATOR — Simple bottom-up parsing demo
// ============================================================

/**
 * Parse grammar from text into rules array.
 * Format: "E -> E + T" or "E -> T" (one per line)
 */
function parseGrammar(text) {
  const rules = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const match = line.match(/^(\S+)\s*->\s*(.+)$/);
    if (!match) continue;

    const lhs = match[1];
    const alternatives = match[2].split('|').map(a => a.trim());

    for (const alt of alternatives) {
      const rhs = alt.split(/\s+/).filter(Boolean);
      rules.push({ lhs, rhs });
    }
  }

  return rules;
}

/**
 * Tokenize input string — handles identifiers, numbers, operators, parens.
 */
function tokenizeInput(input) {
  const tokens = [];
  let i = 0;
  const s = input.trim();

  while (i < s.length) {
    if (/\s/.test(s[i])) { i++; continue; }

    if (/[a-zA-Z_]/.test(s[i])) {
      let id = '';
      while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) {
        id += s[i++];
      }
      tokens.push(id);
    } else if (/[0-9]/.test(s[i])) {
      let num = '';
      while (i < s.length && /[0-9]/.test(s[i])) {
        num += s[i++];
      }
      tokens.push(num);
    } else {
      tokens.push(s[i++]);
    }
  }

  tokens.push('$'); // End marker
  return tokens;
}

/**
 * Try to find a matching rule for the top of the stack.
 * Returns the matching rule or null.
 */
function findReduction(stack, rules) {
  // Try longest match first
  for (let len = Math.min(stack.length, 10); len >= 1; len--) {
    const top = stack.slice(stack.length - len);

    for (const rule of rules) {
      if (rule.rhs.length !== top.length) continue;

      let match = true;
      for (let i = 0; i < top.length; i++) {
        if (rule.rhs[i] !== top[i]) {
          match = false;
          break;
        }
      }

      if (match) return { rule, matchLen: len };
    }
  }

  return null;
}

/**
 * Simulate shift-reduce parsing.
 */
function simulateShiftReduce(grammarText, inputStr) {
  const rules = parseGrammar(grammarText);
  if (rules.length === 0) {
    return { steps: [], accepted: false, error: 'No valid grammar rules found' };
  }

  const startSymbol = rules[0].lhs;
  const tokens = tokenizeInput(inputStr);
  const stack = ['$'];
  let pos = 0;
  const steps = [];
  const maxSteps = 100; // Safety limit

  steps.push({
    step: 0,
    stack: stack.join(' '),
    input: tokens.slice(pos).join(' '),
    action: 'Initialize',
  });

  let stepCount = 0;

  while (stepCount < maxSteps) {
    stepCount++;

    // Check if accepted: stack = [$ S] and input exhausted
    if (stack.length === 2 && stack[1] === startSymbol && pos >= tokens.length - 1) {
      steps.push({
        step: stepCount,
        stack: stack.join(' '),
        input: tokens.slice(pos).join(' '),
        action: `✅ Accepted! Reduced to ${startSymbol}`,
      });
      return { steps, accepted: true, rules, startSymbol };
    }

    // Try to reduce first
    const stackContent = stack.slice(1); // without $
    const reduction = findReduction(stackContent, rules);

    if (reduction) {
      const { rule, matchLen } = reduction;

      // Only reduce if:
      // 1. This is the final reduction to start symbol, OR
      // 2. The next token doesn't suggest we should shift instead
      const shouldReduce = (
        (stackContent.length === matchLen && pos >= tokens.length - 1) || // final
        stackContent.length >= 2 || // non-trivial stack
        pos >= tokens.length - 1 // input exhausted
      );

      if (shouldReduce || (stackContent.length === matchLen && rule.lhs !== startSymbol)) {
        // Perform reduction
        for (let i = 0; i < matchLen; i++) stack.pop();
        stack.push(rule.lhs);

        steps.push({
          step: stepCount,
          stack: stack.join(' '),
          input: tokens.slice(pos).join(' '),
          action: `Reduce: ${rule.lhs} → ${rule.rhs.join(' ')}`,
        });
        continue;
      }
    }

    // Shift
    if (pos < tokens.length - 1) { // don't shift $
      stack.push(tokens[pos]);
      pos++;

      steps.push({
        step: stepCount,
        stack: stack.join(' '),
        input: tokens.slice(pos).join(' '),
        action: `Shift: ${tokens[pos - 1]}`,
      });
      continue;
    }

    // Try one more reduction attempt after input is done
    if (reduction) {
      const { rule, matchLen } = reduction;
      for (let i = 0; i < matchLen; i++) stack.pop();
      stack.push(rule.lhs);

      steps.push({
        step: stepCount,
        stack: stack.join(' '),
        input: tokens.slice(pos).join(' '),
        action: `Reduce: ${rule.lhs} → ${rule.rhs.join(' ')}`,
      });
      continue;
    }

    // Stuck — can't shift or reduce
    steps.push({
      step: stepCount,
      stack: stack.join(' '),
      input: tokens.slice(pos).join(' '),
      action: '❌ Error: Cannot shift or reduce',
    });
    return { steps, accepted: false, rules, startSymbol };
  }

  return { steps, accepted: false, error: 'Maximum steps exceeded', rules, startSymbol };
}

module.exports = { simulateShiftReduce, parseGrammar };
