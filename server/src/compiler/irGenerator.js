// ============================================================
// IR GENERATOR — Three Address Code from AST
// ============================================================

class IRGenerator {
  constructor() {
    this.tempCount = 0;
    this.labelCount = 0;
    this.instructions = [];
  }

  newTemp() { return `t${++this.tempCount}`; }
  newLabel() { return `L${++this.labelCount}`; }

  emit(instruction, comment = '') {
    this.instructions.push({ instruction, comment, line: this.instructions.length + 1 });
  }

  generate(ast) {
    this.visitNode(ast);
    return this.instructions;
  }

  visitNode(node) {
    if (!node) return null;

    switch (node.type) {
      case 'Program':
        node.children.forEach(c => this.visitNode(c));
        return null;

      case 'FunctionDeclaration':
        this.emit(`func_begin ${node.name}`, `Start of function '${node.name}'`);
        node.children.forEach(c => this.visitNode(c));
        this.emit(`func_end ${node.name}`, `End of function '${node.name}'`);
        return null;

      case 'Parameters':
        node.children.forEach((p, i) => {
          this.emit(`param ${p.label}`, `Parameter ${i + 1}`);
        });
        return null;

      case 'Block':
        node.children.forEach(c => this.visitNode(c));
        return null;

      case 'VariableDeclaration': {
        if (node.children.length > 0) {
          const initNode = node.children.find(c => c.type === 'Initializer');
          if (initNode && initNode.children[0]) {
            const val = this.visitNode(initNode.children[0]);
            this.emit(`${node.name} = ${val}`, `Initialize variable '${node.name}' of type '${node.varType}'`);
            return node.name;
          }
        }
        this.emit(`alloc ${node.varType} ${node.name}`, `Declare variable '${node.name}' of type '${node.varType}'`);
        return node.name;
      }

      case 'ExpressionStatement':
        return this.visitNode(node.children[0]);

      case 'AssignmentExpression': {
        const left = node.children[0];
        const right = this.visitNode(node.children[1]);
        const target = left ? (left.name || left.label) : '?';
        const op = node.label;
        if (op === '=') {
          this.emit(`${target} = ${right}`, `Assign value to '${target}'`);
        } else {
          const t = this.newTemp();
          const baseOp = op[0]; // += -> +
          this.emit(`${t} = ${target} ${baseOp} ${right}`, `Compute ${target} ${baseOp} ${right}`);
          this.emit(`${target} = ${t}`, `Update '${target}'`);
        }
        return target;
      }

      case 'BinaryExpression': {
        const left = this.visitNode(node.children[0]);
        const right = this.visitNode(node.children[1]);
        const t = this.newTemp();
        this.emit(`${t} = ${left} ${node.label} ${right}`, `Compute ${left} ${node.label} ${right}`);
        return t;
      }

      case 'UnaryExpression': {
        const operand = this.visitNode(node.children[0]);
        const t = this.newTemp();
        const op = node.label.replace('(pre)', '').trim();
        this.emit(`${t} = ${op}${operand}`, `Unary ${op} on ${operand}`);
        return t;
      }

      case 'PostfixExpression': {
        const operand = this.visitNode(node.children[0]);
        const t = this.newTemp();
        const op = node.label.includes('++') ? '+' : '-';
        this.emit(`${t} = ${operand}`, `Save value of ${operand}`);
        this.emit(`${operand} = ${operand} ${op} 1`, `Postfix ${node.label.replace('(post)', '')} on ${operand}`);
        return t;
      }

      case 'Identifier':
        return node.name || node.label;

      case 'Literal':
      case 'StringLiteral':
      case 'CharLiteral':
        return node.value || node.label;

      case 'IfStatement': {
        const condNode = node.children.find(c => c.type === 'Condition');
        const thenNode = node.children.find(c => c.type === 'Then');
        const elseNode = node.children.find(c => c.type === 'Else');
        const cond = condNode ? this.visitNode(condNode.children[0]) : 'true';
        const labelTrue = this.newLabel();
        const labelFalse = this.newLabel();
        const labelEnd = elseNode ? this.newLabel() : labelFalse;
        this.emit(`if ${cond} goto ${labelTrue}`, `Branch if condition is true`);
        this.emit(`goto ${elseNode ? labelFalse : labelEnd}`, `Jump to ${elseNode ? 'else' : 'end'}`);
        this.emit(`${labelTrue}:`, `True branch`);
        if (thenNode) this.visitNode(thenNode.children[0]);
        if (elseNode) {
          this.emit(`goto ${labelEnd}`, `Skip else branch`);
          this.emit(`${labelFalse}:`, `False branch (else)`);
          this.visitNode(elseNode.children[0]);
        }
        this.emit(`${labelEnd}:`, `End of if`);
        return null;
      }

      case 'WhileStatement': {
        const labelStart = this.newLabel();
        const labelBody = this.newLabel();
        const labelExit = this.newLabel();
        this.emit(`${labelStart}:`, `Loop start`);
        const condNode = node.children.find(c => c.type === 'Condition');
        const cond = condNode ? this.visitNode(condNode.children[0]) : 'true';
        this.emit(`if ${cond} goto ${labelBody}`, `Check loop condition`);
        this.emit(`goto ${labelExit}`, `Exit loop`);
        this.emit(`${labelBody}:`, `Loop body`);
        const bodyNode = node.children.find(c => c.type !== 'Condition');
        if (bodyNode && bodyNode.type !== 'Condition') this.visitNode(bodyNode);
        this.emit(`goto ${labelStart}`, `Repeat loop`);
        this.emit(`${labelExit}:`, `Loop end`);
        return null;
      }

      case 'ForStatement': {
        const initNode = node.children.find(c => c.type === 'ForInit');
        const condNode = node.children.find(c => c.type === 'Condition');
        const updateNode = node.children.find(c => c.type === 'ForUpdate');
        const bodyNode = node.children.find(c => !['ForInit', 'Condition', 'ForUpdate'].includes(c.type));
        if (initNode) this.visitNode(initNode.children[0]);
        const labelStart = this.newLabel();
        const labelBody = this.newLabel();
        const labelExit = this.newLabel();
        this.emit(`${labelStart}:`, `For loop check`);
        const cond = condNode ? this.visitNode(condNode.children[0]) : 'true';
        this.emit(`if ${cond} goto ${labelBody}`, `Check loop condition`);
        this.emit(`goto ${labelExit}`, `Exit loop`);
        this.emit(`${labelBody}:`, `Loop body`);
        if (bodyNode) this.visitNode(bodyNode);
        if (updateNode) this.visitNode(updateNode.children[0]);
        this.emit(`goto ${labelStart}`, `Repeat loop`);
        this.emit(`${labelExit}:`, `Loop end`);
        return null;
      }

      case 'ReturnStatement': {
        if (node.children.length > 0) {
          const val = this.visitNode(node.children[0]);
          this.emit(`return ${val}`, `Return value ${val}`);
        } else {
          this.emit(`return`, `Return void`);
        }
        return null;
      }

      case 'FunctionCall': {
        const args = node.children.map(c => this.visitNode(c));
        args.forEach(a => this.emit(`push ${a}`, `Push argument`));
        const t = this.newTemp();
        this.emit(`${t} = call ${node.name}, ${args.length}`, `Call function '${node.name}' with ${args.length} args`);
        return t;
      }

      case 'Initializer':
        return this.visitNode(node.children[0]);

      case 'Condition':
      case 'Then':
      case 'Else':
      case 'ForInit':
      case 'ForUpdate':
        return this.visitNode(node.children[0]);

      default:
        if (node.children) node.children.forEach(c => this.visitNode(c));
        return null;
    }
  }
}

function generateIR(ast) {
  return new IRGenerator().generate(ast);
}

module.exports = { generateIR, IRGenerator };
