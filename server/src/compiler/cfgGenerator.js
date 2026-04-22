// ============================================================
// CFG GENERATOR — Control Flow Graph from IR Instructions
// ============================================================

class CFGGenerator {
  constructor(irInstructions) {
    this.instructions = irInstructions;
    this.blocks = [];
    this.edges = [];
  }

  generate() {
    this.buildBasicBlocks();
    this.buildEdges();
    return { blocks: this.blocks, edges: this.edges };
  }

  buildBasicBlocks() {
    if (!this.instructions || this.instructions.length === 0) {
      return;
    }

    // Find leaders (first instruction of each basic block)
    const leaders = new Set([0]); // First instruction is always a leader

    for (let i = 0; i < this.instructions.length; i++) {
      const inst = this.instructions[i].instruction;

      // Target of a jump is a leader
      const gotoMatch = inst.match(/goto\s+(L\d+)/);
      const ifGotoMatch = inst.match(/if\s+.+\s+goto\s+(L\d+)/);
      const labelMatch = inst.match(/^(L\d+):/);

      if (labelMatch) {
        leaders.add(i);
      }

      if (gotoMatch || ifGotoMatch) {
        // Instruction after a jump is a leader
        if (i + 1 < this.instructions.length) {
          leaders.add(i + 1);
        }
      }

      // func_begin / func_end are leaders
      if (inst.startsWith('func_begin') || inst.startsWith('func_end')) {
        leaders.add(i);
        if (i + 1 < this.instructions.length) leaders.add(i + 1);
      }
    }

    // Build blocks from leaders
    const sortedLeaders = [...leaders].sort((a, b) => a - b);

    for (let li = 0; li < sortedLeaders.length; li++) {
      const start = sortedLeaders[li];
      const end = li + 1 < sortedLeaders.length ? sortedLeaders[li + 1] - 1 : this.instructions.length - 1;
      
      if (start > end || start >= this.instructions.length) continue;

      const blockInstructions = [];
      for (let i = start; i <= end; i++) {
        blockInstructions.push(this.instructions[i]);
      }

      // Determine block label
      let label = `B${this.blocks.length}`;
      const firstInst = blockInstructions[0].instruction;
      const labelMatch = firstInst.match(/^(L\d+):/);
      if (labelMatch) {
        label = labelMatch[1];
      } else if (firstInst.startsWith('func_begin')) {
        label = firstInst.replace('func_begin ', 'entry: ');
      } else if (firstInst.startsWith('func_end')) {
        label = firstInst.replace('func_end ', 'exit: ');
      }

      // Determine block type
      let blockType = 'normal';
      if (firstInst.startsWith('func_begin')) blockType = 'entry';
      else if (firstInst.startsWith('func_end')) blockType = 'exit';
      else if (blockInstructions.some(i => i.instruction.match(/^if\s/))) blockType = 'condition';
      else if (blockInstructions.some(i => i.instruction.includes('return'))) blockType = 'return';
      else if (blockInstructions.some(i => i.instruction.includes('call '))) blockType = 'call';

      this.blocks.push({
        id: this.blocks.length,
        label,
        instructions: blockInstructions,
        type: blockType,
        startIdx: start,
        endIdx: end,
      });
    }
  }

  buildEdges() {
    // Map labels to block indices
    const labelToBlock = {};
    this.blocks.forEach((block, idx) => {
      block.instructions.forEach(inst => {
        const lm = inst.instruction.match(/^(L\d+):/);
        if (lm) labelToBlock[lm[1]] = idx;
      });
    });

    for (let i = 0; i < this.blocks.length; i++) {
      const block = this.blocks[i];
      const lastInst = block.instructions[block.instructions.length - 1].instruction;

      // Conditional jump: if ... goto Lx
      const ifMatch = lastInst.match(/if\s+.+\s+goto\s+(L\d+)/);
      if (ifMatch) {
        const targetLabel = ifMatch[1];
        const targetBlock = labelToBlock[targetLabel];
        if (targetBlock !== undefined) {
          this.edges.push({ from: i, to: targetBlock, type: 'true', label: 'T' });
        }
        // Fall-through (false branch) — check if there's a goto right before this block ends
        // Actually, the pattern is: if...goto + goto (false path)
        // Let's check the second-to-last or just connect to next block
        if (i + 1 < this.blocks.length) {
          // Check if next instruction is an unconditional goto
          const nextBlock = this.blocks[i + 1];
          const nextFirst = nextBlock.instructions[0].instruction;
          const gotoOnly = nextFirst.match(/^goto\s+(L\d+)$/);
          if (gotoOnly) {
            // The false branch goes to that label
            const falseTarget = labelToBlock[gotoOnly[1]];
            if (falseTarget !== undefined) {
              this.edges.push({ from: i + 1, to: falseTarget, type: 'false', label: 'F' });
            }
          }
        }
        continue;
      }

      // Unconditional goto
      const gotoMatch = lastInst.match(/^goto\s+(L\d+)$/);
      if (gotoMatch) {
        const targetBlock = labelToBlock[gotoMatch[1]];
        if (targetBlock !== undefined) {
          // Determine if this is a back-edge (loop)
          const isBackEdge = targetBlock <= i;
          this.edges.push({ from: i, to: targetBlock, type: isBackEdge ? 'loop' : 'unconditional', label: isBackEdge ? '↺' : '' });
        }
        continue;
      }

      // Return — no outgoing edge (or edge to exit)
      if (lastInst.startsWith('return')) {
        // Find exit block
        const exitBlock = this.blocks.findIndex(b => b.type === 'exit');
        if (exitBlock !== -1 && exitBlock !== i) {
          this.edges.push({ from: i, to: exitBlock, type: 'return', label: 'ret' });
        }
        continue;
      }

      // func_end — no outgoing edge
      if (lastInst.startsWith('func_end')) continue;

      // Fall-through to next block
      if (i + 1 < this.blocks.length) {
        this.edges.push({ from: i, to: i + 1, type: 'fallthrough', label: '' });
      }
    }
  }
}

function generateCFG(irInstructions) {
  return new CFGGenerator(irInstructions).generate();
}

module.exports = { generateCFG, CFGGenerator };
