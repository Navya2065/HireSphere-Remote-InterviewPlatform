const { spawn }  = require('child_process');
const fs          = require('fs');
const os          = require('os');
const path        = require('path');
const crypto      = require('crypto');
const Interview   = require('../models/Interview');

// ─── Piston runtime map (fallback for languages we can't run locally) ────────
const PISTON_RUNTIMES = {
  typescript: { language: 'typescript', version: '5.0.3'  },
  java:       { language: 'java',       version: '15.0.2' },
  csharp:     { language: 'csharp',     version: '6.12.0' },
  go:         { language: 'go',         version: '1.16.2' },
  rust:       { language: 'rust',       version: '1.68.2' },
};

// Language -> source file extension
const EXTENSIONS = {
  javascript: 'js', python: 'py', cpp: 'cpp',
  typescript: 'ts', java: 'java', csharp: 'cs', go: 'go', rust: 'rs',
};

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Run a subprocess and collect stdout/stderr. Kills after timeoutMs. */
function runProcess(cmd, args, timeoutMs = 5000) {
  return new Promise((resolve) => {
    let stdout = '', stderr = '';

    const proc = spawn(cmd, args, { windowsHide: true });

    const timer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch {}
      resolve({ stdout, stderr: `${stderr}\nTimed out after ${timeoutMs / 1000}s.`, exitCode: 124 });
    }, timeoutMs);

    proc.stdout?.on('data', (d) => { stdout += d.toString().slice(0, 50_000); });
    proc.stderr?.on('data', (d) => { stderr += d.toString().slice(0, 50_000); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });
    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: err.message, exitCode: -1 });
    });
  });
}

/** Write code to a temp file and return its path. */
function writeTmp(id, ext, content) {
  const p = path.join(os.tmpdir(), `hs_${id}.${ext}`);
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

/** Delete a file silently. */
function cleanup(...files) {
  for (const f of files) {
    try { fs.unlinkSync(f); } catch {}
  }
}

// ─── Local executor ───────────────────────────────────────────────────────────

/**
 * Try to run code locally. Returns a result object or null if the language is
 * not supported locally (caller should fall back to Piston).
 */
async function executeLocally(language, content) {
  const id = crypto.randomBytes(6).toString('hex');

  if (language === 'python') {
    // Try python3 first (Linux/Mac), then python (Windows)
    const py = process.platform === 'win32' ? 'python' : 'python3';
    const src = writeTmp(id, 'py', content);
    const result = await runProcess(py, [src], 8000);
    cleanup(src);
    return result;
  }

  if (language === 'javascript') {
    // Use the same Node binary that's running this server — always available
    const src = writeTmp(id, 'js', content);
    const result = await runProcess(process.execPath, [src], 8000);
    cleanup(src);
    return result;
  }

  if (language === 'cpp') {
    // Compile with g++ then run
    const src = writeTmp(id, 'cpp', content);
    const exe = path.join(os.tmpdir(), `hs_${id}${process.platform === 'win32' ? '.exe' : ''}`);

    const compile = await runProcess('g++', ['-o', exe, '-std=c++17', src], 15000);
    cleanup(src);

    if (compile.exitCode !== 0) {
      cleanup(exe);
      return { stdout: '', stderr: compile.stderr || compile.stdout, exitCode: compile.exitCode };
    }

    const run = await runProcess(exe, [], 8000);
    cleanup(exe);
    return run;
  }

  // Java — compile + run (only if javac is available)
  if (language === 'java') {
    const className = 'HireSphereMain' + id;
    const src = path.join(os.tmpdir(), `${className}.java`);
    // Rewrite the public class name to match the filename
    const adjusted = content.replace(/public\s+class\s+\w+/, `public class ${className}`);
    fs.writeFileSync(src, adjusted, 'utf8');

    const compile = await runProcess('javac', [src], 15000);
    cleanup(src);

    if (compile.exitCode !== 0) {
      return { stdout: '', stderr: compile.stderr || compile.stdout, exitCode: compile.exitCode };
    }

    const run = await runProcess('java', ['-cp', os.tmpdir(), className], 8000);
    // Cleanup .class files
    try {
      fs.readdirSync(os.tmpdir())
        .filter((f) => f.startsWith(className))
        .forEach((f) => cleanup(path.join(os.tmpdir(), f)));
    } catch {}
    return run;
  }

  return null; // Not supported locally — caller falls back to Piston
}

// ─── Piston fallback ──────────────────────────────────────────────────────────

function filenameFor(lang) {
  const map = {
    javascript: 'main.js',  typescript: 'main.ts', python:  'main.py',
    java:       'Main.java', cpp:        'main.cpp', csharp: 'main.cs',
    go:         'main.go',  rust:        'main.rs',
  };
  return map[lang] || 'main.txt';
}

async function executeViaPiston(language, content) {
  const runtime = PISTON_RUNTIMES[language];
  if (!runtime) return null;

  let resp;
  try {
    resp = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        language: runtime.language,
        version:  runtime.version,
        files:    [{ name: filenameFor(language), content: content.slice(0, 200_000) }],
        stdin:    '',
        compile_timeout: 10_000,
        run_timeout:      8_000,
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    return {
      stdout:   '',
      stderr:   `Could not reach code-execution service: ${err.message}`,
      exitCode: -1,
    };
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    return { stdout: '', stderr: `Runner error (${resp.status}): ${body.slice(0, 300)}`, exitCode: -1 };
  }

  const data = await resp.json();
  return {
    stdout:   data.run?.stdout   || '',
    stderr:   data.run?.stderr   || data.compile?.stderr || '',
    exitCode: data.run?.code     ?? 0,
  };
}

// ─── Controller ───────────────────────────────────────────────────────────────

exports.executeCode = async (req, res) => {
  try {
    const { roomId, language, content } = req.body;

    if (!roomId || !language || typeof content !== 'string') {
      return res.status(400).json({ message: 'roomId, language, and content are required' });
    }
    if (!EXTENSIONS[language]) {
      return res.status(400).json({ message: `Unsupported language: "${language}"` });
    }

    // Authorise: must be a participant in this room
    const interview = await Interview.findOne({ roomId });
    if (!interview) return res.status(404).json({ message: 'Room not found' });
    const isParticipant =
      interview.interviewerId.equals(req.user._id) ||
      interview.candidateId.equals(req.user._id);
    if (!isParticipant) return res.status(403).json({ message: 'Not a participant' });

    // 1 — Try local execution (fast, no network required)
    let result = await executeLocally(language, content);

    // 2 — Fall back to Piston for languages we can't run locally (TS, Go, Rust, etc.)
    if (!result) {
      result = await executeViaPiston(language, content);
    }

    // 3 — Nothing could run it
    if (!result) {
      return res.status(422).json({
        message: `No runner available for "${language}". Install the required compiler/runtime on the server.`,
      });
    }

    const output = {
      language,
      stdout:    result.stdout   || '',
      stderr:    result.stderr   || '',
      exitCode:  result.exitCode ?? 0,
      ranBy:     { id: req.user._id.toString(), name: req.user.name },
      ranAt:     new Date().toISOString(),
    };

    // Broadcast to both participants so the interviewer sees output in real time
    const io = req.app.get('io');
    if (io) io.to(roomId).emit('code-output', output);

    res.json({ result: output });
  } catch (err) {
    console.error('executeCode error:', err);
    res.status(500).json({ message: 'Execution failed: ' + err.message });
  }
};
