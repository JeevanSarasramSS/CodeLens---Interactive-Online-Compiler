// =====================================================
// C PARSER — Recursive Descent Parser producing an AST
// Handles a practical subset of C for visualization
// =====================================================

class Parser {
  constructor(tokens) {
    // Filter out comments and preprocessor for parsing
    this.allTokens = tokens;
    this.tokens = tokens.filter(t => t.type !== 'COMMENT' && t.type !== 'PREPROCESSOR' && t.type !== 'EOF');
    this.pos = 0;
    this.errors = [];
  }

  // --- Helpers ---
  peek() { return this.pos < this.tokens.length ? this.tokens[this.pos] : null; }
  at(type, value) { const t = this.peek(); return t && t.type === type && (value === undefined || t.value === value); }
  eat(type, value) {
    if (this.at(type, value)) return this.tokens[this.pos++];
    const t = this.peek();
    const msg = `Expected ${value || type} but got ${t ? `'${t.value}'` : 'EOF'} at line ${t ? t.line : '?'}`;
    this.errors.push(msg);
    return null;
  }
  advance() { return this.tokens[this.pos++]; }
  isAtEnd() { return this.pos >= this.tokens.length; }
  isType(t) { return t && t.type === 'KEYWORD' && ['int','float','char','double','void','long','short','unsigned','signed','const'].includes(t.value); }

  loc(token) { return token ? { line: token.line, column: token.column } : {}; }

  // --- Entry ---
  parse() {
    const program = { type: 'Program', label: 'Program', children: [], loc: {} };
    try {
      while (!this.isAtEnd()) {
        const decl = this.parseTopLevel();
        if (decl) program.children.push(decl);
        else if (!this.isAtEnd()) this.advance(); // skip on error recovery
      }
    } catch (e) {
      this.errors.push(e.message);
    }
    return { ast: program, errors: this.errors };
  }

  // --- Top Level ---
  parseTopLevel() {
    const t = this.peek();
    if (!t) return null;
    if (this.isType(t)) {
      // Look ahead: Type Name '(' => function, otherwise declaration
      const saved = this.pos;
      const typeStr = this.parseTypeString();
      const name = this.peek();
      if (name && name.type === 'IDENTIFIER') {
        this.advance();
        if (this.at('PUNCTUATION', '(')) {
          return this.parseFunctionDef(typeStr, name);
        }
      }
      this.pos = saved;
      return this.parseDeclaration();
    }
    // Skip unknown tokens
    this.advance();
    return null;
  }

  parseTypeString() {
    let ts = '';
    while (this.isType(this.peek())) { ts += (ts ? ' ' : '') + this.advance().value; }
    return ts || 'int';
  }

  // --- Function Definition ---
  parseFunctionDef(returnType, nameToken) {
    const node = { type: 'FunctionDeclaration', label: `func: ${nameToken.value}`, returnType, name: nameToken.value, children: [], loc: this.loc(nameToken) };
    this.eat('PUNCTUATION', '(');
    // Parse parameters
    const params = { type: 'Parameters', label: 'params', children: [], loc: this.loc(this.peek()) };
    while (!this.at('PUNCTUATION', ')') && !this.isAtEnd()) {
      const pt = this.parseTypeString();
      const pn = this.eat('IDENTIFIER');
      if (pn) params.children.push({ type: 'Parameter', label: `${pt} ${pn.value}`, children: [], loc: this.loc(pn) });
      if (this.at('PUNCTUATION', ',')) this.advance();
    }
    this.eat('PUNCTUATION', ')');
    if (params.children.length > 0) node.children.push(params);
    const body = this.parseBlock();
    if (body) node.children.push(body);
    return node;
  }

  // --- Block ---
  parseBlock() {
    const t = this.peek();
    const node = { type: 'Block', label: 'Block { }', children: [], loc: this.loc(t) };
    this.eat('PUNCTUATION', '{');
    while (!this.at('PUNCTUATION', '}') && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) node.children.push(stmt);
      else if (!this.isAtEnd()) this.advance();
    }
    this.eat('PUNCTUATION', '}');
    return node;
  }

  // --- Statement ---
  parseStatement() {
    const t = this.peek();
    if (!t) return null;

    if (this.isType(t)) return this.parseDeclaration();
    if (t.type === 'KEYWORD' && t.value === 'if') return this.parseIf();
    if (t.type === 'KEYWORD' && t.value === 'while') return this.parseWhile();
    if (t.type === 'KEYWORD' && t.value === 'for') return this.parseFor();
    if (t.type === 'KEYWORD' && t.value === 'return') return this.parseReturn();
    if (t.type === 'KEYWORD' && t.value === 'do') return this.parseDoWhile();
    if (t.type === 'KEYWORD' && t.value === 'switch') return this.parseSwitch();
    if (this.at('PUNCTUATION', '{')) return this.parseBlock();

    return this.parseExpressionStatement();
  }

  // --- Declaration ---
  parseDeclaration() {
    const typeStr = this.parseTypeString();
    const name = this.eat('IDENTIFIER');
    if (!name) { this.skipToSemicolon(); return null; }

    // Check for array declaration
    if (this.at('PUNCTUATION', '[')) {
      this.advance();
      const size = this.parseExpression();
      this.eat('PUNCTUATION', ']');
      this.eat('PUNCTUATION', ';');
      return { type: 'ArrayDeclaration', label: `${typeStr} ${name.value}[]`, children: size ? [size] : [], loc: this.loc(name) };
    }

    const node = { type: 'VariableDeclaration', label: `${typeStr} ${name.value}`, varType: typeStr, name: name.value, children: [], loc: this.loc(name) };

    if (this.at('OPERATOR', '=')) {
      this.advance();
      const init = this.parseExpression();
      if (init) node.children.push({ type: 'Initializer', label: '=', children: [init], loc: init.loc });
    }

    // Handle multiple declarations: int a = 1, b = 2;
    while (this.at('PUNCTUATION', ',')) {
      this.advance();
      // For simplicity, we only visualize the first var
    }

    this.eat('PUNCTUATION', ';');
    return node;
  }

  // --- If ---
  parseIf() {
    const t = this.advance(); // 'if'
    const node = { type: 'IfStatement', label: 'if', children: [], loc: this.loc(t) };
    this.eat('PUNCTUATION', '(');
    const cond = this.parseExpression();
    if (cond) node.children.push({ type: 'Condition', label: 'condition', children: [cond], loc: cond.loc });
    this.eat('PUNCTUATION', ')');
    const then = this.parseStatement();
    if (then) node.children.push({ type: 'Then', label: 'then', children: [then], loc: then.loc });
    if (this.at('KEYWORD', 'else')) {
      this.advance();
      const alt = this.parseStatement();
      if (alt) node.children.push({ type: 'Else', label: 'else', children: [alt], loc: alt.loc });
    }
    return node;
  }

  // --- While ---
  parseWhile() {
    const t = this.advance();
    const node = { type: 'WhileStatement', label: 'while', children: [], loc: this.loc(t) };
    this.eat('PUNCTUATION', '(');
    const cond = this.parseExpression();
    if (cond) node.children.push({ type: 'Condition', label: 'condition', children: [cond], loc: cond.loc });
    this.eat('PUNCTUATION', ')');
    const body = this.parseStatement();
    if (body) node.children.push(body);
    return node;
  }

  // --- For ---
  parseFor() {
    const t = this.advance();
    const node = { type: 'ForStatement', label: 'for', children: [], loc: this.loc(t) };
    this.eat('PUNCTUATION', '(');
    // Init
    if (this.isType(this.peek())) {
      const init = this.parseDeclaration();
      if (init) node.children.push({ type: 'ForInit', label: 'init', children: [init], loc: init.loc });
    } else if (!this.at('PUNCTUATION', ';')) {
      const init = this.parseExpression();
      if (init) node.children.push({ type: 'ForInit', label: 'init', children: [init], loc: init.loc });
      this.eat('PUNCTUATION', ';');
    } else { this.advance(); }
    // Condition
    if (!this.at('PUNCTUATION', ';')) {
      const cond = this.parseExpression();
      if (cond) node.children.push({ type: 'Condition', label: 'condition', children: [cond], loc: cond.loc });
    }
    this.eat('PUNCTUATION', ';');
    // Update
    if (!this.at('PUNCTUATION', ')')) {
      const upd = this.parseExpression();
      if (upd) node.children.push({ type: 'ForUpdate', label: 'update', children: [upd], loc: upd.loc });
    }
    this.eat('PUNCTUATION', ')');
    const body = this.parseStatement();
    if (body) node.children.push(body);
    return node;
  }

  // --- Do-While ---
  parseDoWhile() {
    const t = this.advance();
    const node = { type: 'DoWhileStatement', label: 'do-while', children: [], loc: this.loc(t) };
    const body = this.parseStatement();
    if (body) node.children.push(body);
    this.eat('KEYWORD', 'while');
    this.eat('PUNCTUATION', '(');
    const cond = this.parseExpression();
    if (cond) node.children.push({ type: 'Condition', label: 'condition', children: [cond], loc: cond.loc });
    this.eat('PUNCTUATION', ')');
    this.eat('PUNCTUATION', ';');
    return node;
  }

  // --- Switch (basic) ---
  parseSwitch() {
    const t = this.advance();
    const node = { type: 'SwitchStatement', label: 'switch', children: [], loc: this.loc(t) };
    this.eat('PUNCTUATION', '(');
    const expr = this.parseExpression();
    if (expr) node.children.push(expr);
    this.eat('PUNCTUATION', ')');
    const body = this.parseBlock();
    if (body) node.children.push(body);
    return node;
  }

  // --- Return ---
  parseReturn() {
    const t = this.advance();
    const node = { type: 'ReturnStatement', label: 'return', children: [], loc: this.loc(t) };
    if (!this.at('PUNCTUATION', ';')) {
      const expr = this.parseExpression();
      if (expr) node.children.push(expr);
    }
    this.eat('PUNCTUATION', ';');
    return node;
  }

  // --- Expression Statement ---
  parseExpressionStatement() {
    const expr = this.parseExpression();
    this.eat('PUNCTUATION', ';');
    if (!expr) return null;
    return { type: 'ExpressionStatement', label: 'expr', children: [expr], loc: expr.loc };
  }

  // --- Expression (precedence climbing) ---
  parseExpression() { return this.parseAssignment(); }

  parseAssignment() {
    const left = this.parseLogicalOr();
    if (!left) return null;
    if (this.at('OPERATOR', '=') || this.at('OPERATOR', '+=') || this.at('OPERATOR', '-=') || this.at('OPERATOR', '*=') || this.at('OPERATOR', '/=')) {
      const op = this.advance();
      const right = this.parseAssignment();
      return { type: 'AssignmentExpression', label: op.value, children: [left, right].filter(Boolean), loc: this.loc(op) };
    }
    return left;
  }

  parseLogicalOr() { return this.parseBinaryLeft(() => this.parseLogicalAnd(), ['||']); }
  parseLogicalAnd() { return this.parseBinaryLeft(() => this.parseEquality(), ['&&']); }
  parseEquality() { return this.parseBinaryLeft(() => this.parseRelational(), ['==', '!=']); }
  parseRelational() { return this.parseBinaryLeft(() => this.parseAdditive(), ['<', '>', '<=', '>=']); }
  parseAdditive() { return this.parseBinaryLeft(() => this.parseMultiplicative(), ['+', '-']); }
  parseMultiplicative() { return this.parseBinaryLeft(() => this.parseUnary(), ['*', '/', '%']); }

  parseBinaryLeft(nextLevel, ops) {
    let left = nextLevel();
    while (this.peek() && this.peek().type === 'OPERATOR' && ops.includes(this.peek().value)) {
      const op = this.advance();
      const right = nextLevel();
      left = { type: 'BinaryExpression', label: op.value, children: [left, right].filter(Boolean), loc: this.loc(op) };
    }
    return left;
  }

  parseUnary() {
    if (this.at('OPERATOR', '!') || this.at('OPERATOR', '-') || this.at('OPERATOR', '++') || this.at('OPERATOR', '--') || this.at('OPERATOR', '~')) {
      const op = this.advance();
      const operand = this.parseUnary();
      return { type: 'UnaryExpression', label: `${op.value}(pre)`, children: operand ? [operand] : [], loc: this.loc(op) };
    }
    return this.parsePostfix();
  }

  parsePostfix() {
    let expr = this.parsePrimary();
    while (this.at('OPERATOR', '++') || this.at('OPERATOR', '--')) {
      const op = this.advance();
      expr = { type: 'PostfixExpression', label: `${op.value}(post)`, children: expr ? [expr] : [], loc: this.loc(op) };
    }
    return expr;
  }

  parsePrimary() {
    const t = this.peek();
    if (!t) return null;

    // Parenthesized expression
    if (t.type === 'PUNCTUATION' && t.value === '(') {
      this.advance();
      const expr = this.parseExpression();
      this.eat('PUNCTUATION', ')');
      return expr;
    }

    // Number literal
    if (t.type === 'INT_LITERAL' || t.type === 'FLOAT_LITERAL') {
      this.advance();
      return { type: 'Literal', label: t.value, value: t.value, dataType: t.type === 'INT_LITERAL' ? 'int' : 'float', children: [], loc: this.loc(t) };
    }

    // String literal
    if (t.type === 'STRING_LITERAL') {
      this.advance();
      return { type: 'StringLiteral', label: t.value, value: t.value, children: [], loc: this.loc(t) };
    }

    // Char literal
    if (t.type === 'CHAR_LITERAL') {
      this.advance();
      return { type: 'CharLiteral', label: t.value, value: t.value, children: [], loc: this.loc(t) };
    }

    // sizeof
    if (t.type === 'KEYWORD' && t.value === 'sizeof') {
      this.advance();
      this.eat('PUNCTUATION', '(');
      const inner = this.parseExpression();
      this.eat('PUNCTUATION', ')');
      return { type: 'SizeofExpression', label: 'sizeof', children: inner ? [inner] : [], loc: this.loc(t) };
    }

    // Identifier or function call
    if (t.type === 'IDENTIFIER' || (t.type === 'KEYWORD' && (t.value === 'printf' || t.value === 'scanf'))) {
      this.advance();
      if (this.at('PUNCTUATION', '(')) {
        return this.parseFunctionCall(t);
      }
      // Array access
      if (this.at('PUNCTUATION', '[')) {
        this.advance();
        const idx = this.parseExpression();
        this.eat('PUNCTUATION', ']');
        return { type: 'ArrayAccess', label: `${t.value}[]`, children: idx ? [idx] : [], loc: this.loc(t) };
      }
      return { type: 'Identifier', label: t.value, name: t.value, children: [], loc: this.loc(t) };
    }

    // Can't parse — skip
    this.advance();
    return null;
  }

  parseFunctionCall(nameToken) {
    const node = { type: 'FunctionCall', label: `call: ${nameToken.value}()`, name: nameToken.value, children: [], loc: this.loc(nameToken) };
    this.eat('PUNCTUATION', '(');
    while (!this.at('PUNCTUATION', ')') && !this.isAtEnd()) {
      const arg = this.parseExpression();
      if (arg) node.children.push(arg);
      if (this.at('PUNCTUATION', ',')) this.advance();
      else break;
    }
    this.eat('PUNCTUATION', ')');
    return node;
  }

  skipToSemicolon() {
    while (!this.isAtEnd() && !this.at('PUNCTUATION', ';')) this.advance();
    if (!this.isAtEnd()) this.advance();
  }
}

function parse(tokens) {
  return new Parser(tokens).parse();
}

module.exports = { parse, Parser };
