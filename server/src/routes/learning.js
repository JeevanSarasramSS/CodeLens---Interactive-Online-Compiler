// ============================================================
// /api/learning — Interactive Learning Mode API
// Single route, action-based dispatch
// ============================================================

const express = require('express');
const router = express.Router();
const { tokenize } = require('../compiler/lexer');
const { parse } = require('../compiler/parser');
const { generateIR } = require('../compiler/irGenerator');
const { generateCFG } = require('../compiler/cfgGenerator');
const { optimizeIR } = require('../compiler/optimizer');
const { analyze } = require('../compiler/semantic');
const { removeLeftRecursion } = require('../compiler/leftRecursion');
const { convertExpression } = require('../compiler/postfixConverter');
const { simulateShiftReduce } = require('../compiler/shiftReduceSimulator');

// ============================================================
// FIRST & FOLLOW SET COMPUTATION (inline)
// ============================================================

function parseGrammarForFF(text) {
  const rules = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const nonTerminals = new Set();
  const allSymbols = new Set();

  for (const line of lines) {
    const match = line.match(/^(\S+)\s*->\s*(.+)$/);
    if (!match) continue;
    const lhs = match[1];
    nonTerminals.add(lhs);
    const alternatives = match[2].split('|').map(a => a.trim());
    for (const alt of alternatives) {
      const symbols = alt.split(/\s+/).filter(Boolean);
      rules.push({ lhs, rhs: symbols });
      symbols.forEach(s => allSymbols.add(s));
    }
  }

  const terminals = new Set();
  allSymbols.forEach(s => {
    if (!nonTerminals.has(s) && s !== 'ε' && s !== 'epsilon') terminals.add(s);
  });

  return { rules, nonTerminals: [...nonTerminals], terminals: [...terminals] };
}

function computeFirst(rules, nonTerminals) {
  const first = {};
  nonTerminals.forEach(nt => first[nt] = new Set());

  let changed = true;
  while (changed) {
    changed = false;
    for (const rule of rules) {
      const { lhs, rhs } = rule;
      const before = first[lhs].size;

      if (rhs.length === 1 && (rhs[0] === 'ε' || rhs[0] === 'epsilon')) {
        first[lhs].add('ε');
      } else {
        let allCanBeEmpty = true;
        for (const sym of rhs) {
          if (!first[sym]) {
            // Terminal
            first[lhs].add(sym);
            allCanBeEmpty = false;
            break;
          } else {
            // Non-terminal — add FIRST(sym) minus ε
            first[sym].forEach(f => { if (f !== 'ε') first[lhs].add(f); });
            if (!first[sym].has('ε')) {
              allCanBeEmpty = false;
              break;
            }
          }
        }
        if (allCanBeEmpty) first[lhs].add('ε');
      }

      if (first[lhs].size > before) changed = true;
    }
  }

  return first;
}

function computeFollow(rules, nonTerminals, first, startSymbol) {
  const follow = {};
  nonTerminals.forEach(nt => follow[nt] = new Set());
  follow[startSymbol].add('$');

  let changed = true;
  while (changed) {
    changed = false;
    for (const rule of rules) {
      const { lhs, rhs } = rule;

      for (let i = 0; i < rhs.length; i++) {
        const sym = rhs[i];
        if (!follow[sym]) continue; // Terminal, skip

        const before = follow[sym].size;

        // Look at what follows sym in this production
        let j = i + 1;
        while (j < rhs.length) {
          const next = rhs[j];
          if (!first[next]) {
            // Terminal
            follow[sym].add(next);
            break;
          } else {
            first[next].forEach(f => { if (f !== 'ε') follow[sym].add(f); });
            if (!first[next].has('ε')) break;
            j++;
          }
        }

        // If we reached the end, add FOLLOW(lhs)
        if (j >= rhs.length) {
          follow[lhs].forEach(f => follow[sym].add(f));
        }

        if (follow[sym].size > before) changed = true;
      }
    }
  }

  return follow;
}

function buildLL1Table(rules, nonTerminals, terminals, first, follow) {
  const table = {};
  const conflicts = [];
  nonTerminals.forEach(nt => { table[nt] = {}; });

  for (const rule of rules) {
    const { lhs, rhs } = rule;
    const prodStr = `${lhs} → ${rhs.join(' ')}`;

    // Compute FIRST of this production's RHS
    const prodFirst = new Set();
    let allCanBeEmpty = true;

    for (const sym of rhs) {
      if (sym === 'ε' || sym === 'epsilon') {
        prodFirst.add('ε');
        break;
      }
      if (!first[sym]) {
        prodFirst.add(sym);
        allCanBeEmpty = false;
        break;
      }
      first[sym].forEach(f => { if (f !== 'ε') prodFirst.add(f); });
      if (!first[sym].has('ε')) {
        allCanBeEmpty = false;
        break;
      }
    }
    if (allCanBeEmpty) prodFirst.add('ε');

    // For each terminal in FIRST(rhs), add to table
    prodFirst.forEach(t => {
      if (t === 'ε') return;
      if (table[lhs][t]) {
        conflicts.push({ cell: `[${lhs}, ${t}]`, existing: table[lhs][t], new: prodStr });
      }
      table[lhs][t] = prodStr;
    });

    // If ε is in FIRST(rhs), add for each terminal in FOLLOW(lhs)
    if (prodFirst.has('ε')) {
      follow[lhs].forEach(t => {
        if (table[lhs][t]) {
          conflicts.push({ cell: `[${lhs}, ${t}]`, existing: table[lhs][t], new: prodStr });
        }
        table[lhs][t] = prodStr;
      });
    }
  }

  return { table, conflicts };
}

function computeFirstFollow(grammarText) {
  const { rules, nonTerminals, terminals } = parseGrammarForFF(grammarText);
  if (rules.length === 0) return { error: 'No valid grammar rules found' };

  const startSymbol = nonTerminals[0];
  const first = computeFirst(rules, nonTerminals);
  const follow = computeFollow(rules, nonTerminals, first, startSymbol);

  // Convert sets to arrays for JSON
  const firstSets = {};
  const followSets = {};
  nonTerminals.forEach(nt => {
    firstSets[nt] = [...first[nt]].sort();
    followSets[nt] = [...follow[nt]].sort();
  });

  const allTerminals = [...new Set([...terminals, '$'])];
  const { table, conflicts } = buildLL1Table(rules, nonTerminals, allTerminals, first, follow);

  return {
    rules: rules.map(r => `${r.lhs} → ${r.rhs.join(' ')}`),
    nonTerminals,
    terminals: allTerminals,
    firstSets,
    followSets,
    parsingTable: table,
    conflicts,
    startSymbol,
    isLL1: conflicts.length === 0,
  };
}

// ============================================================
// REGEX → NFA → DFA (inline, Thompson's Construction)
// ============================================================

let stateCounter = 0;
function newState() { return stateCounter++; }

function regexToNFA(regex) {
  stateCounter = 0;
  const postfix = regexToPostfix(regex);
  const stack = [];

  for (const ch of postfix) {
    if (ch === '.') {
      // Concatenation
      const b = stack.pop();
      const a = stack.pop();
      if (!a || !b) continue;
      a.accept.forEach(s => {
        if (!a.transitions[s]) a.transitions[s] = [];
        a.transitions[s].push({ to: b.start, symbol: 'ε' });
      });
      stack.push({
        start: a.start,
        accept: b.accept,
        transitions: { ...a.transitions, ...b.transitions },
        states: [...a.states, ...b.states],
      });
    } else if (ch === '|') {
      const b = stack.pop();
      const a = stack.pop();
      if (!a || !b) continue;
      const s = newState();
      const f = newState();
      const transitions = { ...a.transitions, ...b.transitions };
      transitions[s] = [
        { to: a.start, symbol: 'ε' },
        { to: b.start, symbol: 'ε' },
      ];
      a.accept.forEach(acc => {
        if (!transitions[acc]) transitions[acc] = [];
        transitions[acc].push({ to: f, symbol: 'ε' });
      });
      b.accept.forEach(acc => {
        if (!transitions[acc]) transitions[acc] = [];
        transitions[acc].push({ to: f, symbol: 'ε' });
      });
      stack.push({
        start: s,
        accept: [f],
        transitions,
        states: [...a.states, ...b.states, s, f],
      });
    } else if (ch === '*') {
      const a = stack.pop();
      if (!a) continue;
      const s = newState();
      const f = newState();
      const transitions = { ...a.transitions };
      transitions[s] = [
        { to: a.start, symbol: 'ε' },
        { to: f, symbol: 'ε' },
      ];
      a.accept.forEach(acc => {
        if (!transitions[acc]) transitions[acc] = [];
        transitions[acc].push({ to: a.start, symbol: 'ε' });
        transitions[acc].push({ to: f, symbol: 'ε' });
      });
      stack.push({
        start: s,
        accept: [f],
        transitions,
        states: [...a.states, s, f],
      });
    } else if (ch === '+') {
      const a = stack.pop();
      if (!a) continue;
      const s = newState();
      const f = newState();
      const transitions = { ...a.transitions };
      transitions[s] = [{ to: a.start, symbol: 'ε' }];
      a.accept.forEach(acc => {
        if (!transitions[acc]) transitions[acc] = [];
        transitions[acc].push({ to: a.start, symbol: 'ε' });
        transitions[acc].push({ to: f, symbol: 'ε' });
      });
      stack.push({
        start: s,
        accept: [f],
        transitions,
        states: [...a.states, s, f],
      });
    } else if (ch === '?') {
      const a = stack.pop();
      if (!a) continue;
      const s = newState();
      const f = newState();
      const transitions = { ...a.transitions };
      transitions[s] = [
        { to: a.start, symbol: 'ε' },
        { to: f, symbol: 'ε' },
      ];
      a.accept.forEach(acc => {
        if (!transitions[acc]) transitions[acc] = [];
        transitions[acc].push({ to: f, symbol: 'ε' });
      });
      stack.push({
        start: s,
        accept: [f],
        transitions,
        states: [...a.states, s, f],
      });
    } else {
      // Literal character
      const s = newState();
      const f = newState();
      stack.push({
        start: s,
        accept: [f],
        transitions: { [s]: [{ to: f, symbol: ch }] },
        states: [s, f],
      });
    }
  }

  if (stack.length === 0) {
    const s = newState();
    return { start: s, accept: [s], transitions: {}, states: [s] };
  }

  return stack[0];
}

function regexToPostfix(regex) {
  let output = '';
  const ops = [];
  let prevWasAtom = false;

  const precedence = { '|': 1, '.': 2, '*': 3, '+': 3, '?': 3 };

  // Insert explicit concatenation
  let expanded = '';
  for (let i = 0; i < regex.length; i++) {
    expanded += regex[i];
    if (i + 1 < regex.length) {
      const c = regex[i];
      const n = regex[i + 1];
      if (
        (c !== '(' && c !== '|' && n !== ')' && n !== '|' && n !== '*' && n !== '+' && n !== '?')
      ) {
        expanded += '.';
      }
    }
  }

  for (const ch of expanded) {
    if (ch === '(') {
      ops.push(ch);
    } else if (ch === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') {
        output += ops.pop();
      }
      if (ops.length) ops.pop(); // remove (
    } else if (precedence[ch] !== undefined) {
      while (
        ops.length &&
        ops[ops.length - 1] !== '(' &&
        (precedence[ops[ops.length - 1]] || 0) >= precedence[ch]
      ) {
        output += ops.pop();
      }
      ops.push(ch);
    } else {
      output += ch;
    }
  }

  while (ops.length) output += ops.pop();
  return output;
}

function epsilonClosure(states, transitions) {
  const closure = new Set(states);
  const worklist = [...states];

  while (worklist.length > 0) {
    const state = worklist.pop();
    const trans = transitions[state] || [];
    for (const t of trans) {
      if (t.symbol === 'ε' && !closure.has(t.to)) {
        closure.add(t.to);
        worklist.push(t.to);
      }
    }
  }

  return [...closure].sort((a, b) => a - b);
}

function move(states, symbol, transitions) {
  const result = new Set();
  for (const state of states) {
    const trans = transitions[state] || [];
    for (const t of trans) {
      if (t.symbol === symbol) result.add(t.to);
    }
  }
  return [...result];
}

function nfaToDFA(nfa) {
  // Collect alphabet (non-epsilon symbols)
  const alphabet = new Set();
  for (const state of nfa.states) {
    const trans = nfa.transitions[state] || [];
    for (const t of trans) {
      if (t.symbol !== 'ε') alphabet.add(t.symbol);
    }
  }

  const startClosure = epsilonClosure([nfa.start], nfa.transitions);
  const stateKey = (arr) => arr.join(',');

  const dfaStates = [startClosure];
  const dfaTransitions = {};
  const stateMap = { [stateKey(startClosure)]: 0 };
  let nextId = 1;
  const worklist = [startClosure];
  const acceptStates = new Set();

  // Check if start is accepting
  if (startClosure.some(s => nfa.accept.includes(s))) {
    acceptStates.add(0);
  }

  while (worklist.length > 0) {
    const current = worklist.pop();
    const currentKey = stateKey(current);
    const currentId = stateMap[currentKey];

    for (const sym of alphabet) {
      const moved = move(current, sym, nfa.transitions);
      if (moved.length === 0) continue;
      const closure = epsilonClosure(moved, nfa.transitions);
      const closureKey = stateKey(closure);

      if (stateMap[closureKey] === undefined) {
        stateMap[closureKey] = nextId;
        dfaStates.push(closure);
        worklist.push(closure);

        if (closure.some(s => nfa.accept.includes(s))) {
          acceptStates.add(nextId);
        }
        nextId++;
      }

      if (!dfaTransitions[currentId]) dfaTransitions[currentId] = [];
      dfaTransitions[currentId].push({ to: stateMap[closureKey], symbol: sym });
    }
  }

  return {
    states: Array.from({ length: nextId }, (_, i) => i),
    start: 0,
    accept: [...acceptStates],
    transitions: dfaTransitions,
    alphabet: [...alphabet],
    stateMapping: Object.entries(stateMap).map(([k, v]) => ({ dfaState: v, nfaStates: k.split(',').map(Number) })),
  };
}

function formatNFAForDisplay(nfa) {
  const nodes = [];
  const edges = [];

  for (const state of nfa.states) {
    nodes.push({
      id: state,
      label: `q${state}`,
      isStart: state === nfa.start,
      isAccept: nfa.accept.includes(state),
    });

    const trans = nfa.transitions[state] || [];
    for (const t of trans) {
      edges.push({ from: state, to: t.to, symbol: t.symbol });
    }
  }

  return { nodes, edges };
}

function formatDFAForDisplay(dfa) {
  const nodes = [];
  const edges = [];

  for (const state of dfa.states) {
    nodes.push({
      id: state,
      label: `D${state}`,
      isStart: state === dfa.start,
      isAccept: dfa.accept.includes(state),
    });

    const trans = dfa.transitions[state] || [];
    for (const t of trans) {
      edges.push({ from: state, to: t.to, symbol: t.symbol });
    }
  }

  return { nodes, edges };
}

function processRegex(regex) {
  try {
    const nfa = regexToNFA(regex);
    const dfa = nfaToDFA(nfa);

    return {
      success: true,
      nfa: formatNFAForDisplay(nfa),
      dfa: formatDFAForDisplay(dfa),
      dfaMapping: dfa.stateMapping,
      alphabet: dfa.alphabet,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ============================================================
// ROUTE HANDLER
// ============================================================

router.post('/', (req, res) => {
  const { action } = req.body;

  try {
    switch (action) {
      // Unit 1: Tokenizer
      case 'tokenize': {
        const { code } = req.body;
        if (!code) return res.json({ error: 'No code provided' });
        const tokens = tokenize(code).filter(t => t.type !== 'EOF');
        const summary = {};
        tokens.forEach(t => { summary[t.type] = (summary[t.type] || 0) + 1; });
        return res.json({ success: true, tokens, summary, count: tokens.length });
      }

      // Unit 1: Regex → Automata
      case 'automata': {
        const { regex } = req.body;
        if (!regex) return res.json({ error: 'No regex provided' });
        return res.json(processRegex(regex));
      }

      // Unit 2: FIRST & FOLLOW
      case 'firstFollow': {
        const { grammar } = req.body;
        if (!grammar) return res.json({ error: 'No grammar provided' });
        const result = computeFirstFollow(grammar);
        return res.json({ success: true, ...result });
      }

      // Unit 2: Left Recursion Removal
      case 'leftRecursion': {
        const { grammar } = req.body;
        if (!grammar) return res.json({ error: 'No grammar provided' });
        const result = removeLeftRecursion(grammar);
        return res.json({ success: true, ...result });
      }

      // Unit 3: Shift-Reduce
      case 'shiftReduce': {
        const { grammar, input } = req.body;
        if (!grammar || !input) return res.json({ error: 'Grammar and input required' });
        const result = simulateShiftReduce(grammar, input);
        return res.json({ success: true, ...result });
      }

      // Unit 4: Postfix / Prefix
      case 'postfix': {
        const { expression } = req.body;
        if (!expression) return res.json({ error: 'No expression provided' });
        const result = convertExpression(expression);
        return res.json({ success: true, ...result });
      }

      // Unit 4: Expression → 3AC (full pipeline)
      case 'threeAC': {
        const { code } = req.body;
        if (!code) return res.json({ error: 'No code provided' });
        const tokens = tokenize(code);
        const { ast } = parse(tokens);
        const ir = generateIR(ast);
        return res.json({ success: true, instructions: ir, count: ir.length });
      }

      // Unit 5: CFG
      case 'cfg': {
        const { code } = req.body;
        if (!code) return res.json({ error: 'No code provided' });
        const tokens = tokenize(code);
        const { ast } = parse(tokens);
        const ir = generateIR(ast);
        const cfg = generateCFG(ir);
        return res.json({ success: true, ...cfg });
      }

      // Unit 5: Optimization
      case 'optimize': {
        const { code } = req.body;
        if (!code) return res.json({ error: 'No code provided' });
        const tokens = tokenize(code);
        const { ast } = parse(tokens);
        const semanticResult = analyze(ast);
        const ir = generateIR(ast);
        const result = optimizeIR(ir, semanticResult);
        return res.json({ success: true, ...result });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return res.status(500).json({ error: `Processing failed: ${err.message}` });
  }
});

module.exports = router;
