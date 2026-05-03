// ============================================================
// /api/compile — Compile and execute C code via GCC
// ============================================================

const express = require('express');
const router = express.Router();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TEMP_DIR = path.join(__dirname, '..', '..', 'temp');
const IS_WIN = process.platform === 'win32';
const EXE_EXT = IS_WIN ? '.exe' : '.out';

// Ensure temp dir exists
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

router.post('/', (req, res) => {
  const { code, input = '' } = req.body;

  if (!code || !code.trim()) {
    return res.status(400).json({ error: 'No code provided' });
  }

  const id = uuidv4().slice(0, 8);
  const srcFile = path.join(TEMP_DIR, `${id}.c`);
  const exeFile = path.join(TEMP_DIR, `${id}${EXE_EXT}`);

  try {
    // Write source file
    fs.writeFileSync(srcFile, code);

    // Compile with GCC
    try {
      execSync(`gcc "${srcFile}" -o "${exeFile}" -lm 2>&1`, {
        timeout: 10000,
        encoding: 'utf-8'
      });
    } catch (compileErr) {
      const stderr = compileErr.stdout || compileErr.stderr || compileErr.message;
      // Clean paths from error message for cleaner display
      const cleanError = stderr.replace(new RegExp(srcFile.replace(/\\/g, '\\\\'), 'g'), 'source.c');
      return res.json({
        success: false,
        phase: 'compilation',
        error: cleanError,
        output: ''
      });
    }

    // Execute the compiled binary
    const startTime = Date.now();
    try {
      let output;
      if (input.trim()) {
        const echoCmd = IS_WIN ? `echo ${input} | "${exeFile}"` : `echo '${input}' | "${exeFile}"`;
        output = execSync(echoCmd, {
          timeout: 5000,
          encoding: 'utf-8',
          maxBuffer: 1024 * 1024
        });
      } else {
        output = execSync(`"${exeFile}"`, {
          timeout: 5000,
          encoding: 'utf-8',
          maxBuffer: 1024 * 1024
        });
      }
      const executionTime = Date.now() - startTime;

      return res.json({
        success: true,
        output: output || '(no output)',
        executionTime: `${executionTime}ms`,
        error: ''
      });
    } catch (runErr) {
      const executionTime = Date.now() - startTime;
      return res.json({
        success: false,
        phase: 'runtime',
        error: runErr.message || 'Runtime error',
        output: runErr.stdout || '',
        executionTime: `${executionTime}ms`
      });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  } finally {
    // Cleanup temp files
    try { if (fs.existsSync(srcFile)) fs.unlinkSync(srcFile); } catch {}
    try { if (fs.existsSync(exeFile)) fs.unlinkSync(exeFile); } catch {}
  }
});

module.exports = router;
