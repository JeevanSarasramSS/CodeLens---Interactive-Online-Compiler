// ============================================================
// /api/analyze — Run all compiler phases and return results
// ============================================================

const express = require('express');
const router = express.Router();
const { tokenize } = require('../compiler/lexer');
const { parse } = require('../compiler/parser');
const { analyze } = require('../compiler/semantic');
const { generateIR } = require('../compiler/irGenerator');
const { explainTokens, explainAST, explainSemantic, explainIR } = require('../compiler/explainer');
const { optimizeIR } = require('../compiler/optimizer');
const { generateCFG } = require('../compiler/cfgGenerator');

router.post('/', (req, res) => {
  const { code } = req.body;

  if (!code || !code.trim()) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    // Phase 1: Lexical Analysis
    const tokens = tokenize(code);

    // Phase 2: Syntax Analysis (Parsing)
    const { ast, errors: parseErrors } = parse(tokens);

    // Phase 3: Semantic Analysis
    const semanticResult = analyze(ast);

    // Phase 4: Intermediate Code Generation
    const irCode = generateIR(ast);

    // Phase 5: Code Optimization
    const optimizationResult = optimizeIR(irCode, semanticResult);

    // Phase 6: Control Flow Graph
    const cfg = generateCFG(irCode);

    // Phase 7: Explanations for each phase
    const explanations = {
      tokens: explainTokens(tokens),
      ast: explainAST(ast),
      semantic: explainSemantic(semanticResult),
      ir: explainIR(irCode)
    };

    return res.json({
      success: true,
      phases: {
        lexical: {
          tokens: tokens.filter(t => t.type !== 'EOF'),
          tokenCount: tokens.filter(t => t.type !== 'EOF').length,
          summary: buildTokenSummary(tokens)
        },
        syntax: {
          ast,
          errors: parseErrors
        },
        semantic: semanticResult,
        ir: {
          instructions: irCode,
          instructionCount: irCode.length
        },
        optimization: optimizationResult,
        cfg,
        explanations
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Analysis failed: ${err.message}`
    });
  }
});

// Quick tokenize endpoint for live typing
router.post('/tokens', (req, res) => {
  const { code } = req.body;
  if (!code) return res.json({ tokens: [] });
  try {
    const tokens = tokenize(code).filter(t => t.type !== 'EOF');
    return res.json({ tokens });
  } catch {
    return res.json({ tokens: [] });
  }
});

function buildTokenSummary(tokens) {
  const counts = {};
  tokens.forEach(t => {
    if (t.type === 'EOF') return;
    counts[t.type] = (counts[t.type] || 0) + 1;
  });
  return counts;
}

module.exports = router;
