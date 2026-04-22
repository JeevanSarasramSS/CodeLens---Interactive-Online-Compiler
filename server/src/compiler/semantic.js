// =====================================================
// SEMANTIC ANALYZER — Symbol table + basic type checks
// =====================================================

class SemanticAnalyzer {
  constructor() {
    this.scopes = [{}]; // stack of scope maps
    this.symbolTable = [];
    this.warnings = [];
    this.errors = [];
  }

  currentScope() { return this.scopes[this.scopes.length - 1]; }
  pushScope(name) { this.scopes.push({ __name: name }); }
  popScope() { this.scopes.pop(); }

  declare(name, type, line, scopeName) {
    const scope = this.currentScope();
    if (scope[name]) {
      this.errors.push({ message: `Duplicate declaration of '${name}' in scope '${scopeName || 'global'}'`, line, severity: 'error' });
      return;
    }
    const entry = { name, type, scope: scopeName || 'global', line, initialized: false, used: false };
    scope[name] = entry;
    this.symbolTable.push(entry);
  }

  lookup(name) {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i][name]) return this.scopes[i][name];
    }
    return null;
  }

  analyze(ast) {
    this.visit(ast, 'global');
    // Check for unused variables
    this.symbolTable.forEach(entry => {
      if (!entry.used && entry.name !== 'main' && entry.scope !== 'param') {
        this.warnings.push({ message: `Variable '${entry.name}' is declared but never used`, line: entry.line, severity: 'warning' });
      }
    });
    return { symbolTable: this.symbolTable, warnings: this.warnings, errors: this.errors };
  }

  visit(node, scopeName) {
    if (!node) return null;

    switch (node.type) {
      case 'Program':
        node.children.forEach(c => this.visit(c, 'global'));
        break;

      case 'FunctionDeclaration':
        this.declare(node.name, node.returnType, node.loc?.line, 'global');
        const entry = this.lookup(node.name);
        if (entry) { entry.initialized = true; entry.used = true; }
        this.pushScope(node.name);
        node.children.forEach(c => this.visit(c, node.name));
        this.popScope();
        break;

      case 'Parameters':
        node.children.forEach(p => {
          if (p.label) {
            const parts = p.label.split(' ');
            const pType = parts.slice(0, -1).join(' ');
            const pName = parts[parts.length - 1];
            this.declare(pName, pType, p.loc?.line, 'param');
            const pe = this.lookup(pName);
            if (pe) { pe.initialized = true; pe.used = true; }
          }
        });
        break;

      case 'VariableDeclaration': {
        this.declare(node.name, node.varType, node.loc?.line, scopeName);
        const hasInit = node.children.some(c => c.type === 'Initializer');
        if (hasInit) {
          const ve = this.lookup(node.name);
          if (ve) ve.initialized = true;
          node.children.forEach(c => this.visit(c, scopeName));
        } else {
          this.warnings.push({ message: `Variable '${node.name}' is declared but not initialized`, line: node.loc?.line, severity: 'warning' });
        }
        break;
      }

      case 'AssignmentExpression': {
        // Check right side first
        if (node.children[1]) this.visit(node.children[1], scopeName);
        // Check left side
        if (node.children[0] && node.children[0].type === 'Identifier') {
          const sym = this.lookup(node.children[0].name);
          if (!sym) {
            this.errors.push({ message: `Undeclared variable '${node.children[0].name}'`, line: node.children[0].loc?.line, severity: 'error' });
          } else {
            sym.initialized = true;
            sym.used = true;
          }
        }
        break;
      }

      case 'Identifier': {
        const sym = this.lookup(node.name);
        if (!sym) {
          this.errors.push({ message: `Undeclared variable '${node.name}'`, line: node.loc?.line, severity: 'error' });
        } else {
          sym.used = true;
          if (!sym.initialized) {
            this.warnings.push({ message: `Variable '${node.name}' may be used before initialization`, line: node.loc?.line, severity: 'warning' });
          }
        }
        break;
      }

      case 'BinaryExpression': {
        const leftType = this.visit(node.children[0], scopeName);
        const rightType = this.visit(node.children[1], scopeName);
        // Basic type mismatch check
        if (leftType && rightType && leftType !== rightType) {
          if ((leftType === 'int' && rightType === 'float') || (leftType === 'float' && rightType === 'int')) {
            this.warnings.push({ message: `Implicit type conversion between '${leftType}' and '${rightType}'`, line: node.loc?.line, severity: 'warning' });
          }
        }
        return leftType === 'float' || rightType === 'float' ? 'float' : leftType || rightType;
      }

      case 'Literal':
        return node.dataType || 'int';

      case 'StringLiteral':
        return 'char*';

      case 'CharLiteral':
        return 'char';

      case 'Block':
        this.pushScope(scopeName + '_block');
        node.children.forEach(c => this.visit(c, scopeName));
        this.popScope();
        break;

      case 'ReturnStatement':
      case 'ExpressionStatement':
      case 'Initializer':
      case 'Condition':
      case 'Then':
      case 'Else':
      case 'ForInit':
      case 'ForUpdate':
        node.children.forEach(c => this.visit(c, scopeName));
        break;

      case 'FunctionCall':
        node.children.forEach(c => this.visit(c, scopeName));
        break;

      case 'IfStatement':
      case 'WhileStatement':
      case 'ForStatement':
      case 'DoWhileStatement':
      case 'SwitchStatement':
        node.children.forEach(c => this.visit(c, scopeName));
        break;

      case 'UnaryExpression':
      case 'PostfixExpression':
        if (node.children[0]) return this.visit(node.children[0], scopeName);
        break;

      default:
        if (node.children) node.children.forEach(c => this.visit(c, scopeName));
        break;
    }
    return null;
  }
}

function analyze(ast) {
  return new SemanticAnalyzer().analyze(ast);
}

module.exports = { analyze, SemanticAnalyzer };
