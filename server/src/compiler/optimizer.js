// ============================================================
// CODE OPTIMIZER — Applies compiler optimizations on IR
// Shows before/after with explanations
// ============================================================

class Optimizer {
  constructor(irInstructions, semanticResult) {
    this.original = irInstructions.map(i => ({ ...i }));
    this.instructions = irInstructions.map(i => ({ ...i }));
    this.semantic = semanticResult;
    this.optimizations = [];
  }

  optimize() {
    this.constantFolding();
    this.copyPropagation();
    this.deadCodeElimination();
    this.strengthReduction();

    return {
      original: this.original,
      optimized: this.instructions.filter(i => !i._removed),
      optimizations: this.optimizations,
      stats: {
        originalCount: this.original.length,
        optimizedCount: this.instructions.filter(i => !i._removed).length,
        removed: this.instructions.filter(i => i._removed).length,
        applied: this.optimizations.length
      }
    };
  }

  constantFolding() {
    // Evaluate constant expressions at compile time
    // Pattern: t1 = <num> <op> <num>
    const constRegex = /^(\w+)\s*=\s*(-?\d+(?:\.\d+)?)\s*([+\-*/%])\s*(-?\d+(?:\.\d+)?)$/;
    
    for (let i = 0; i < this.instructions.length; i++) {
      const inst = this.instructions[i];
      const match = inst.instruction.match(constRegex);
      if (match) {
        const [, dest, leftStr, op, rightStr] = match;
        const left = parseFloat(leftStr);
        const right = parseFloat(rightStr);
        let result;
        switch (op) {
          case '+': result = left + right; break;
          case '-': result = left - right; break;
          case '*': result = left * right; break;
          case '/': result = right !== 0 ? left / right : null; break;
          case '%': result = right !== 0 ? left % right : null; break;
        }
        if (result !== null && result !== undefined) {
          const resultStr = Number.isInteger(result) ? result.toString() : result.toFixed(2);
          const oldInst = inst.instruction;
          inst.instruction = `${dest} = ${resultStr}`;
          inst.comment = `Constant folded: ${leftStr} ${op} ${rightStr} = ${resultStr}`;
          inst._optimized = 'constant-fold';
          this.optimizations.push({
            type: 'Constant Folding',
            icon: '🧮',
            description: `Expression \`${leftStr} ${op} ${rightStr}\` evaluated at compile time to \`${resultStr}\``,
            before: oldInst,
            after: inst.instruction,
            saving: 'Eliminates runtime arithmetic — CPU doesn\'t need to compute this'
          });
        }
      }
    }
  }

  copyPropagation() {
    // Pattern: t1 = a; then b = t1 → b = a (when t1 is a temp used once)
    const assignRegex = /^(\w+)\s*=\s*(\w+)$/;
    const tempUsage = {};

    // Count temp usage
    for (const inst of this.instructions) {
      const tokens = inst.instruction.split(/\s+/);
      tokens.forEach(t => {
        if (/^t\d+$/.test(t)) tempUsage[t] = (tempUsage[t] || 0) + 1;
      });
    }

    for (let i = 0; i < this.instructions.length; i++) {
      const inst = this.instructions[i];
      const match = inst.instruction.match(assignRegex);
      if (match) {
        const [, dest, src] = match;
        // If dest is a temp and src is a simple var, propagate
        if (/^t\d+$/.test(dest) && !/^t\d+$/.test(src) && (tempUsage[dest] || 0) <= 2) {
          // Find all later uses of dest and replace with src
          let propagated = false;
          for (let j = i + 1; j < this.instructions.length; j++) {
            const later = this.instructions[j];
            const re = new RegExp(`\\b${dest}\\b`, 'g');
            if (re.test(later.instruction)) {
              const oldInst = later.instruction;
              later.instruction = later.instruction.replace(re, src);
              later._optimized = 'copy-prop';
              propagated = true;
            }
          }
          if (propagated) {
            const oldInst = inst.instruction;
            inst._removed = true;
            inst._optimized = 'copy-prop-removed';
            this.optimizations.push({
              type: 'Copy Propagation',
              icon: '📋',
              description: `Temporary \`${dest}\` eliminated — replaced with direct reference to \`${src}\``,
              before: `${oldInst} → ... uses ${dest} ...`,
              after: `(removed) → ... uses ${src} directly ...`,
              saving: 'Reduces temporary variables and memory operations'
            });
          }
        }
      }
    }
  }

  deadCodeElimination() {
    // Remove alloc/assign for variables that are never used afterward
    if (!this.semantic) return;
    
    const unusedVars = this.semantic.symbolTable
      .filter(s => !s.used && s.name !== 'main')
      .map(s => s.name);

    for (const varName of unusedVars) {
      for (let i = 0; i < this.instructions.length; i++) {
        const inst = this.instructions[i];
        if (inst._removed) continue;
        // Match: varName = ... or alloc ... varName
        const assignMatch = inst.instruction.match(new RegExp(`^${varName}\\s*=`));
        const allocMatch = inst.instruction.match(new RegExp(`^alloc\\s+\\w+\\s+${varName}$`));
        if (assignMatch || allocMatch) {
          inst._removed = true;
          inst._optimized = 'dead-code';
          this.optimizations.push({
            type: 'Dead Code Elimination',
            icon: '💀',
            description: `Variable \`${varName}\` is never used — removed its definition and assignments`,
            before: inst.instruction,
            after: '(removed)',
            saving: 'Reduces code size and eliminates wasted computation'
          });
        }
      }
    }
  }

  strengthReduction() {
    // Replace expensive operations with cheaper ones
    // x * 2 → x << 1, x * 4 → x << 2, x / 2 → x >> 1
    const mulRegex = /^(\w+)\s*=\s*(\w+)\s*\*\s*(\d+)$/;
    const divRegex = /^(\w+)\s*=\s*(\w+)\s*\/\s*(\d+)$/;

    for (let i = 0; i < this.instructions.length; i++) {
      const inst = this.instructions[i];
      if (inst._removed || inst._optimized) continue;

      let match = inst.instruction.match(mulRegex);
      if (match) {
        const [, dest, src, numStr] = match;
        const num = parseInt(numStr);
        if (num > 0 && (num & (num - 1)) === 0) { // power of 2
          const shift = Math.log2(num);
          const oldInst = inst.instruction;
          inst.instruction = `${dest} = ${src} << ${shift}`;
          inst.comment = `Strength reduced: * ${num} → << ${shift}`;
          inst._optimized = 'strength-reduce';
          this.optimizations.push({
            type: 'Strength Reduction',
            icon: '💪',
            description: `Multiplication \`${src} * ${num}\` replaced with left shift \`${src} << ${shift}\` (power of 2)`,
            before: oldInst,
            after: inst.instruction,
            saving: 'Bit shift is ~3x faster than multiplication on most CPUs'
          });
        }
      }

      match = inst.instruction.match(divRegex);
      if (match) {
        const [, dest, src, numStr] = match;
        const num = parseInt(numStr);
        if (num > 0 && (num & (num - 1)) === 0) {
          const shift = Math.log2(num);
          const oldInst = inst.instruction;
          inst.instruction = `${dest} = ${src} >> ${shift}`;
          inst.comment = `Strength reduced: / ${num} → >> ${shift}`;
          inst._optimized = 'strength-reduce';
          this.optimizations.push({
            type: 'Strength Reduction',
            icon: '💪',
            description: `Division \`${src} / ${num}\` replaced with right shift \`${src} >> ${shift}\``,
            before: oldInst,
            after: inst.instruction,
            saving: 'Bit shift is significantly faster than division'
          });
        }
      }
    }
  }
}

function optimizeIR(irInstructions, semanticResult) {
  return new Optimizer(irInstructions, semanticResult).optimize();
}

module.exports = { optimizeIR, Optimizer };
