// ============================================================
// /api/analyze — Run all compiler phases and return results
// ============================================================

const express = require('express');
const router = express.Router();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { tokenize } = require('../compiler/lexer');
const { parse } = require('../compiler/parser');
const { analyze } = require('../compiler/semantic');
const { generateIR } = require('../compiler/irGenerator');
const { explainTokens, explainAST, explainSemantic, explainIR } = require('../compiler/explainer');
const { optimizeIR } = require('../compiler/optimizer');
const { generateCFG } = require('../compiler/cfgGenerator');

const TEMP_DIR = path.join(__dirname, '..', '..', 'temp');
const IS_WIN = process.platform === 'win32';
const EXE_EXT = IS_WIN ? '.exe' : '.out';
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Helper: compile and run code, returns output result object
function executeCode(code, input = '') {
  const id = uuidv4().slice(0, 8);
  const srcFile = path.join(TEMP_DIR, `${id}.c`);
  const exeFile = path.join(TEMP_DIR, `${id}${EXE_EXT}`);

  try {
    fs.writeFileSync(srcFile, code);

    try {
      execSync(`gcc "${srcFile}" -o "${exeFile}" -lm 2>&1`, {
        timeout: 10000,
        encoding: 'utf-8'
      });
    } catch (compileErr) {
      const stderr = compileErr.stdout || compileErr.stderr || compileErr.message;
      const cleanError = stderr.replace(new RegExp(srcFile.replace(/\\/g, '\\\\'), 'g'), 'source.c');
      return { success: false, phase: 'compilation', error: cleanError, output: '' };
    }

    const startTime = Date.now();
    try {
      let output;
      if (input.trim()) {
        const echoCmd = IS_WIN ? `echo ${input} | "${exeFile}"` : `echo '${input}' | "${exeFile}"`;
        output = execSync(echoCmd, {
          timeout: 5000, encoding: 'utf-8', maxBuffer: 1024 * 1024
        });
      } else {
        output = execSync(`"${exeFile}"`, {
          timeout: 5000, encoding: 'utf-8', maxBuffer: 1024 * 1024
        });
      }
      return { success: true, output: output || '(no output)', executionTime: `${Date.now() - startTime}ms`, error: '' };
    } catch (runErr) {
      return { success: false, phase: 'runtime', error: runErr.message || 'Runtime error', output: runErr.stdout || '', executionTime: `${Date.now() - startTime}ms` };
    }
  } finally {
    try { if (fs.existsSync(srcFile)) fs.unlinkSync(srcFile); } catch {}
    try { if (fs.existsSync(exeFile)) fs.unlinkSync(exeFile); } catch {}
  }
}

router.post('/', (req, res) => {
  const { code, input = '', includeOutput = false } = req.body;

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

    // Phase 8 (optional): Execute code and include output
    let output = null;
    if (includeOutput) {
      output = executeCode(code, input);
    }

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
        explanations,
        ...(output ? { output } : {})
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
