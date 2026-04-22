// ============================================================
// EXPLANATION ENGINE — Dynamic, code-aware explanations
// ============================================================

const KEYWORD_EXPLANATIONS = {
  'int': 'defines an integer variable type (whole numbers)',
  'float': 'defines a floating-point variable type (decimal numbers)',
  'double': 'defines a double-precision floating-point type',
  'char': 'defines a character variable type (single character)',
  'void': 'indicates no return value or empty parameter list',
  'return': 'exits the function and optionally sends back a value',
  'if': 'starts a conditional branch — executes code only when condition is true',
  'else': 'provides an alternative branch when the if-condition is false',
  'while': 'creates a loop that repeats while condition is true',
  'for': 'creates a counted loop with init, condition, and increment',
  'do': 'starts a do-while loop that executes at least once',
  'switch': 'selects one of many code blocks to execute based on value',
  'case': 'defines a branch in a switch statement',
  'break': 'exits the current loop or switch statement',
  'continue': 'skips to the next iteration of a loop',
  'const': 'declares a variable whose value cannot be changed',
  'struct': 'defines a composite data type grouping multiple variables',
  'typedef': 'creates an alias for an existing data type',
  'sizeof': 'returns the size in bytes of a type or variable',
  'unsigned': 'modifier for non-negative integer types only',
  'signed': 'modifier allowing both positive and negative values',
  'long': 'modifier for larger integer storage',
  'short': 'modifier for smaller integer storage',
  'static': 'preserves variable value between function calls',
  'extern': 'declares a variable defined in another file',
  'enum': 'defines a set of named integer constants',
  'union': 'defines a type where all members share the same memory',
  'volatile': 'tells compiler the variable may change unexpectedly',
  'register': 'suggests storing variable in a CPU register for speed',
  'auto': 'default storage class for local variables',
  'default': 'the fallback branch in a switch statement',
  'goto': 'jumps to a labeled statement (generally discouraged)',
};

const OPERATOR_EXPLANATIONS = {
  '=': 'assignment operator — stores a value in a variable',
  '+': 'addition operator — adds two values',
  '-': 'subtraction operator — subtracts right from left',
  '*': 'multiplication operator — multiplies two values',
  '/': 'division operator — divides left by right',
  '%': 'modulo operator — gives the remainder of division',
  '==': 'equality check — tests if two values are equal',
  '!=': 'inequality check — tests if two values are different',
  '<': 'less-than comparison',
  '>': 'greater-than comparison',
  '<=': 'less-than-or-equal comparison',
  '>=': 'greater-than-or-equal comparison',
  '&&': 'logical AND — true only when both sides are true',
  '||': 'logical OR — true when at least one side is true',
  '!': 'logical NOT — inverts a boolean value',
  '++': 'increment — increases value by 1',
  '--': 'decrement — decreases value by 1',
  '+=': 'add-and-assign — shorthand for x = x + value',
  '-=': 'subtract-and-assign — shorthand for x = x - value',
  '*=': 'multiply-and-assign',
  '/=': 'divide-and-assign',
  '&': 'bitwise AND / address-of operator',
  '|': 'bitwise OR operator',
  '^': 'bitwise XOR operator',
  '~': 'bitwise NOT — inverts all bits',
  '<<': 'left shift — multiplies by powers of 2',
  '>>': 'right shift — divides by powers of 2',
  '->': 'arrow operator — accesses member of a pointer to struct',
};

function explainTokens(tokens) {
  const explanations = [];
  const seen = new Set();

  for (const token of tokens) {
    const key = `${token.type}:${token.value}`;
    if (seen.has(key)) continue;
    seen.add(key);

    let explanation = '';
    switch (token.type) {
      case 'KEYWORD':
        explanation = KEYWORD_EXPLANATIONS[token.value]
          ? `Keyword '${token.value}' ${KEYWORD_EXPLANATIONS[token.value]}`
          : `Keyword '${token.value}' is a reserved word in C`;
        break;
      case 'IDENTIFIER':
        if (['printf', 'scanf', 'main', 'puts', 'gets', 'strlen', 'strcmp', 'malloc', 'free'].includes(token.value)) {
          explanation = `'${token.value}' is a standard library function`;
        } else {
          explanation = `Identifier '${token.value}' is a user-defined name (variable or function)`;
        }
        break;
      case 'OPERATOR':
        explanation = OPERATOR_EXPLANATIONS[token.value]
          ? `Operator '${token.value}' — ${OPERATOR_EXPLANATIONS[token.value]}`
          : `Operator '${token.value}' performs an operation`;
        break;
      case 'INT_LITERAL':
        explanation = `Integer literal ${token.value} — a whole number constant`;
        break;
      case 'FLOAT_LITERAL':
        explanation = `Float literal ${token.value} — a decimal number constant`;
        break;
      case 'STRING_LITERAL':
        explanation = `String literal ${token.value} — a sequence of characters`;
        break;
      case 'CHAR_LITERAL':
        explanation = `Character literal ${token.value} — a single character constant`;
        break;
      case 'PUNCTUATION':
        const punctMap = { '(': 'opens a group/parameter list', ')': 'closes a group/parameter list', '{': 'begins a code block', '}': 'ends a code block', '[': 'opens array index', ']': 'closes array index', ';': 'statement terminator', ',': 'separates items in a list', '.': 'member access operator' };
        explanation = `Punctuation '${token.value}' — ${punctMap[token.value] || 'delimiter'}`;
        break;
      case 'PREPROCESSOR':
        if (token.value.includes('#include')) {
          const lib = token.value.match(/<(.+?)>|"(.+?)"/);
          explanation = `Preprocessor directive — includes the ${lib ? `'${lib[1] || lib[2]}'` : ''} header file`;
        } else if (token.value.includes('#define')) {
          explanation = `Preprocessor directive — defines a macro constant`;
        } else {
          explanation = `Preprocessor directive — processed before compilation`;
        }
        break;
      case 'COMMENT':
        explanation = `Comment — ignored by the compiler, used for documentation`;
        break;
    }

    if (explanation) {
      explanations.push({ token: token.value, type: token.type, explanation, line: token.line });
    }
  }

  return explanations;
}

function explainAST(ast) {
  const explanations = [];
  walkAST(ast, explanations);
  return explanations;
}

function walkAST(node, explanations) {
  if (!node) return;

  switch (node.type) {
    case 'Program':
      explanations.push({ node: 'Program', explanation: 'The root node — represents the entire source file' });
      break;
    case 'FunctionDeclaration':
      explanations.push({ node: node.label, explanation: `Function '${node.name}' returns '${node.returnType}' — ${node.name === 'main' ? 'this is the program entry point where execution begins' : 'a reusable block of code'}` });
      break;
    case 'VariableDeclaration':
      explanations.push({ node: node.label, explanation: `Declares variable '${node.name}' of type '${node.varType}'${node.children.length > 0 ? ' with an initial value' : ''}` });
      break;
    case 'IfStatement':
      explanations.push({ node: 'if', explanation: 'Conditional branch — the compiler generates conditional jumps to handle true/false paths' });
      break;
    case 'WhileStatement':
      explanations.push({ node: 'while', explanation: 'Loop construct — the compiler creates a back-edge in the control flow graph' });
      break;
    case 'ForStatement':
      explanations.push({ node: 'for', explanation: 'For loop — syntactic sugar that the compiler breaks into init, condition check, body, and update phases' });
      break;
    case 'BinaryExpression':
      explanations.push({ node: node.label, explanation: `Binary operation '${node.label}' — operates on two sub-expressions (left and right operands)` });
      break;
    case 'AssignmentExpression':
      explanations.push({ node: node.label, explanation: `Assignment — stores the right-hand value into the left-hand variable` });
      break;
    case 'ReturnStatement':
      explanations.push({ node: 'return', explanation: 'Returns control to the calling function with an optional value' });
      break;
    case 'FunctionCall':
      explanations.push({ node: node.label, explanation: `Function call to '${node.name}' — pushes arguments onto stack and transfers control` });
      break;
  }

  if (node.children) node.children.forEach(c => walkAST(c, explanations));
}

function explainSemantic(result) {
  const explanations = [];

  if (result.symbolTable.length > 0) {
    explanations.push({ type: 'info', explanation: `Symbol table contains ${result.symbolTable.length} entries — the compiler tracks all declared names, their types, and scopes` });
  }

  result.symbolTable.forEach(sym => {
    explanations.push({ type: 'symbol', explanation: `'${sym.name}' is registered as type '${sym.type}' in scope '${sym.scope}' — ${sym.initialized ? 'initialized' : 'uninitialized'}` });
  });

  result.errors.forEach(err => {
    explanations.push({ type: 'error', explanation: `❌ ${err.message} — the compiler would reject this at line ${err.line}` });
  });

  result.warnings.forEach(warn => {
    explanations.push({ type: 'warning', explanation: `⚠️ ${warn.message} — this may cause unexpected behavior` });
  });

  return explanations;
}

function explainIR(instructions) {
  return instructions.map(inst => ({
    instruction: inst.instruction,
    explanation: inst.comment || 'Intermediate instruction'
  }));
}

module.exports = { explainTokens, explainAST, explainSemantic, explainIR };
