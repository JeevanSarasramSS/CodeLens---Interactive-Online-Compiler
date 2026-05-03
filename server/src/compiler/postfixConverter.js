// ============================================================
// POSTFIX / PREFIX CONVERTER — Shunting-Yard Algorithm
// ============================================================

const PRECEDENCE = {
  '+': 1, '-': 1,
  '*': 2, '/': 2, '%': 2,
  '^': 3,
};

const RIGHT_ASSOC = new Set(['^']);

function tokenizeExpr(expr) {
  const tokens = [];
  let i = 0;
  const s = expr.replace(/\s+/g, '');

  while (i < s.length) {
    if (/[a-zA-Z_]/.test(s[i])) {
      let id = '';
      while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) {
        id += s[i++];
      }
      tokens.push({ type: 'operand', value: id });
    } else if (/[0-9]/.test(s[i])) {
      let num = '';
      while (i < s.length && /[0-9.]/.test(s[i])) {
        num += s[i++];
      }
      tokens.push({ type: 'operand', value: num });
    } else if (s[i] === '(') {
      tokens.push({ type: 'lparen', value: '(' });
      i++;
    } else if (s[i] === ')') {
      tokens.push({ type: 'rparen', value: ')' });
      i++;
    } else if (PRECEDENCE[s[i]] !== undefined) {
      tokens.push({ type: 'operator', value: s[i] });
      i++;
    } else {
      i++;
    }
  }
  return tokens;
}

/**
 * Convert infix to postfix using the Shunting-Yard algorithm.
 * Returns { postfix, steps[] } where steps trace the algorithm execution.
 */
function infixToPostfix(expr) {
  const tokens = tokenizeExpr(expr);
  const output = [];
  const stack = [];
  const steps = [];

  for (const token of tokens) {
    if (token.type === 'operand') {
      output.push(token.value);
      steps.push({
        token: token.value,
        action: 'Operand → output',
        output: output.join(' '),
        stack: stack.map(s => s.value).join(' '),
      });
    } else if (token.type === 'operator') {
      while (
        stack.length > 0 &&
        stack[stack.length - 1].type === 'operator' &&
        (
          (!RIGHT_ASSOC.has(token.value) && PRECEDENCE[token.value] <= PRECEDENCE[stack[stack.length - 1].value]) ||
          (RIGHT_ASSOC.has(token.value) && PRECEDENCE[token.value] < PRECEDENCE[stack[stack.length - 1].value])
        )
      ) {
        const popped = stack.pop();
        output.push(popped.value);
        steps.push({
          token: token.value,
          action: `Pop ${popped.value} (higher precedence) → output`,
          output: output.join(' '),
          stack: stack.map(s => s.value).join(' '),
        });
      }
      stack.push(token);
      steps.push({
        token: token.value,
        action: `Push ${token.value} to stack`,
        output: output.join(' '),
        stack: stack.map(s => s.value).join(' '),
      });
    } else if (token.type === 'lparen') {
      stack.push(token);
      steps.push({
        token: '(',
        action: 'Push ( to stack',
        output: output.join(' '),
        stack: stack.map(s => s.value).join(' '),
      });
    } else if (token.type === 'rparen') {
      while (stack.length > 0 && stack[stack.length - 1].type !== 'lparen') {
        const popped = stack.pop();
        output.push(popped.value);
      }
      if (stack.length > 0) stack.pop(); // remove '('
      steps.push({
        token: ')',
        action: 'Pop until ( → output',
        output: output.join(' '),
        stack: stack.map(s => s.value).join(' '),
      });
    }
  }

  // Pop remaining operators
  while (stack.length > 0) {
    const popped = stack.pop();
    output.push(popped.value);
    steps.push({
      token: '—',
      action: `Pop remaining ${popped.value} → output`,
      output: output.join(' '),
      stack: stack.map(s => s.value).join(' '),
    });
  }

  return {
    postfix: output.join(' '),
    steps,
  };
}

/**
 * Convert infix to prefix by reversing, swapping parens, converting to postfix, then reversing again.
 */
function infixToPrefix(expr) {
  // Reverse the expression
  const reversed = expr.split('').reverse().map(c => {
    if (c === '(') return ')';
    if (c === ')') return '(';
    return c;
  }).join('');

  const { postfix } = infixToPostfix(reversed);

  // Reverse the postfix result
  return postfix.split(' ').reverse().join(' ');
}

function convertExpression(expr) {
  const { postfix, steps } = infixToPostfix(expr);
  const prefix = infixToPrefix(expr);

  return {
    infix: expr.trim(),
    postfix,
    prefix,
    steps,
  };
}

module.exports = { convertExpression, infixToPostfix, infixToPrefix };
