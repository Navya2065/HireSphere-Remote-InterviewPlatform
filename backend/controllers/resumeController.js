const fs      = require('fs');
const path    = require('path');
const https   = require('https');
const { spawn } = require('child_process');
const Resume  = require('../models/Resume');

// ─── helpers ────────────────────────────────────────────────────────────────


const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'resumes');

/** Decode base64 → Buffer → write to disk. Returns the file path. */
function savePdf(base64Data, resumeId) {
  // Create the directory if it doesn't exist
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const buf = Buffer.from(base64Data, 'base64');
  const dest = path.join(UPLOAD_DIR, `${resumeId}.pdf`);

  fs.writeFileSync(dest, buf);
  return dest;
}

/** Pure Node.js PDF text extractor — no dependencies.
 *  Parses raw PDF content streams to pull out text operators. */
function extractTextNode(pdfPath) {
  const buf     = fs.readFileSync(pdfPath);
  const content = buf.toString('binary');

  // Decompress any FlateDecode streams we can reach
  const texts = [];

  // ── Pass 1: grab raw BT…ET blocks from uncompressed streams ──────────────
  const btEt = content.match(/BT[\s\S]*?ET/g) || [];
  for (const block of btEt) {
    // (string) Tj
    const tjRe = /\(([^)\\]|\\.)*\)\s*Tj/g;
    let m;
    while ((m = tjRe.exec(block)) !== null) {
      const raw = m[0].match(/\(([\s\S]*?)\)\s*Tj/)[1];
      texts.push(decodePdfString(raw));
    }
    // [(string) gap (string) …] TJ
    const tjArr = block.match(/\[[\s\S]*?\]\s*TJ/g) || [];
    for (const arr of tjArr) {
      const parts = arr.match(/\(([^)\\]|\\.)*\)/g) || [];
      for (const p of parts) texts.push(decodePdfString(p.slice(1, -1)));
    }
  }

  // ── Pass 2: extract hex strings from BT blocks ────────────────────────────
  for (const block of btEt) {
    const hexRe = /<([0-9a-fA-F]+)>\s*Tj/g;
    let m;
    while ((m = hexRe.exec(block)) !== null) {
      const hex = m[1];
      let s = '';
      for (let i = 0; i + 1 < hex.length; i += 2)
        s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
      texts.push(s);
    }
  }

  const result = texts.join(' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return result;
}

function decodePdfString(raw) {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));
}

/** Run extract_pdf.py via Python (python3 → python fallback).
 *  Falls back to pure-Node extraction if Python/pdfplumber is unavailable. */
function extractText(pdfPath) {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'extract_pdf.py');

  function tryPython(cmd) {
    return new Promise((resolve, reject) => {
      const py = spawn(cmd, [scriptPath, pdfPath]);
      let out = '', err = '';
      py.stdout.on('data', (d) => { out += d.toString(); });
      py.stderr.on('data', (d) => { err += d.toString(); });
      py.on('error', reject);
      py.on('close', (code) => {
        if (code !== 0) return reject(new Error(`exit ${code}: ${err}`));
        const text = out.trim();
        if (!text) return reject(new Error('python returned empty output'));
        resolve(text);
      });
    });
  }

  return tryPython('python3')
    .catch(() => tryPython('python'))
    .catch((pythonErr) => {
      console.warn('[resume] Python extraction failed, using Node fallback:', pythonErr.message);
      const text = extractTextNode(pdfPath);
      if (!text) throw new Error('No extractable text found in PDF (may be image-based)');
      return text;
    });
}

/** Call the Anthropic Messages API and return the assistant's text reply. */
function callAnthropic(apiKey, messages, maxTokens = 2000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model:      'claude-opus-4-6',
      max_tokens: maxTokens,
      messages,
    });

    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path:     '/v1/messages',
        method:   'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length':    Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) return reject(new Error(parsed.error.message));
            resolve(parsed.content[0].text);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/** Build the resume-analysis prompt (text mode). */
function buildAnalysisPrompt(extractedText, roleName) {
  const roleContext = roleName
    ? `The candidate is applying for the role: **${roleName}**.\n`
    : 'No specific role was provided — assess general employability.\n';

  return `You are an expert technical recruiter and career coach. Analyse the resume below and return a JSON object with detailed, actionable feedback.

${roleContext}
RESUME TEXT:
"""
${extractedText.slice(0, 8000)}
"""

Return ONLY valid JSON — no markdown fences, no commentary — with exactly this structure:
{
  "strengths":    ["...", "...", "..."],
  "weaknesses":   ["...", "...", "..."],
  "improvements": ["...", "...", "..."],
  "roleScore":    7,
  "summary":      "Two-to-three sentence executive summary of this candidate."
}

Rules:
- strengths    : 3–5 specific things the resume does well
- weaknesses   : 3–5 specific areas that need improvement
- improvements : 3–5 concrete, actionable steps the candidate can take
- roleScore    : integer 1–10 reflecting fit for the role (or general hireability)
- summary      : plain prose, 2–3 sentences`;
}

/** Build analysis messages for PDF-vision mode (scanned / image-based PDFs). */
function buildVisionMessages(pdfBase64, roleName) {
  const roleContext = roleName
    ? `The candidate is applying for the role: **${roleName}**.`
    : 'No specific role was provided — assess general employability.';

  const prompt = `You are an expert technical recruiter and career coach. Read the resume in the attached PDF and return a JSON object with detailed, actionable feedback.

${roleContext}

Return ONLY valid JSON — no markdown fences, no commentary — with exactly this structure:
{
  "strengths":    ["...", "...", "..."],
  "weaknesses":   ["...", "...", "..."],
  "improvements": ["...", "...", "..."],
  "roleScore":    7,
  "summary":      "Two-to-three sentence executive summary of this candidate.",
  "extractedText": "Full plain-text of the resume as you read it."
}

Rules:
- strengths    : 3–5 specific things the resume does well
- weaknesses   : 3–5 specific areas that need improvement
- improvements : 3–5 concrete, actionable steps the candidate can take
- roleScore    : integer 1–10 reflecting fit for the role (or general hireability)
- summary      : plain prose, 2–3 sentences
- extractedText: the raw text you read from the resume (used for storage)`;

  return [
    {
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type:       'base64',
            media_type: 'application/pdf',
            data:       pdfBase64,
          },
        },
        { type: 'text', text: prompt },
      ],
    },
  ];
}

// ─── controllers ────────────────────────────────────────────────────────────

/**
 * POST /api/resumes/upload
 * Body: { name: string, base64: string }
 * Candidate only.
 */
exports.uploadResume = async (req, res) => {
  try {
    const { name, base64 } = req.body;
    if (!name || !base64) {
      return res.status(400).json({ message: 'name and base64 are required' });
    }
    if (!name.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ message: 'Only PDF files are accepted' });
    }

    // Create a preliminary DB record to get a stable _id for the filename
    const resume = await Resume.create({
      candidateId:  req.user._id,
      originalName: name,
      storedPath:   'pending',
    });

    // Save file to disk
    const filePath = savePdf(base64, resume._id.toString());
    resume.storedPath = filePath;

    // Extract text
    let extractedText = '';
    try {
      extractedText = await extractText(filePath);
      console.log(`[resume] extracted ${extractedText.length} chars from ${path.basename(filePath)}`);
    } catch (e) {
      console.warn('[resume] PDF text extraction failed:', e.message);
      extractedText = '';
    }
    resume.extractedText = extractedText;
    await resume.save();

    res.status(201).json({ resume: _safeResume(resume) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Upload failed', detail: err.message });
  }
};

/**
 * POST /api/resumes/:id/analyze
 * Body (optional): { roleName: string }
 * Candidate (own) or interviewer.
 */
exports.analyzeResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) return res.status(404).json({ message: 'Resume not found' });

    // Access control: candidate can only analyze their own, interviewers can analyze any
    if (
      req.user.role === 'candidate' &&
      resume.candidateId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        message: 'ANTHROPIC_API_KEY is not configured. Add it to backend/.env to enable AI feedback.',
      });
    }

    const roleName       = (req.body.roleName || '').trim();
    const hasText        = resume.extractedText && resume.extractedText.trim().length >= 50;
    const useVision      = !hasText;
    let messages;

    if (useVision) {
      // PDF is image-based — read file and send directly to Claude as a document
      console.log('[resume] no extracted text — using PDF vision mode');
      if (!resume.storedPath || !fs.existsSync(resume.storedPath)) {
        return res.status(422).json({ message: 'PDF file not found on server for vision analysis' });
      }
      const pdfBase64 = fs.readFileSync(resume.storedPath).toString('base64');
      messages = buildVisionMessages(pdfBase64, roleName);
    } else {
      messages = [{ role: 'user', content: buildAnalysisPrompt(resume.extractedText, roleName) }];
    }

    const raw = await callAnthropic(apiKey, messages, 2000);

    let parsed;
    try {
      // Strip any accidental markdown fences
      const clean = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch (e) {
      console.error('Failed to parse AI response:', raw);
      return res.status(502).json({ message: 'AI returned malformed JSON', raw });
    }

    // If vision mode returned extractedText, backfill it so future re-analyses use text mode
    if (useVision && parsed.extractedText && parsed.extractedText.trim().length > 50) {
      resume.extractedText = parsed.extractedText.trim();
      console.log(`[resume] vision extracted ${resume.extractedText.length} chars — backfilled`);
    }

    resume.feedback = {
      strengths:    parsed.strengths    || [],
      weaknesses:   parsed.weaknesses   || [],
      improvements: parsed.improvements || [],
      roleScore:    parsed.roleScore    ?? null,
      roleName:     roleName,
      summary:      parsed.summary      || '',
      analyzedAt:   new Date(),
    };
    await resume.save();

    res.json({ resume: _safeResume(resume) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Analysis failed', detail: err.message });
  }
};

/**
 * GET /api/resumes/my
 * Returns the authenticated candidate's resumes (newest first).
 */
exports.getMyResumes = async (req, res) => {
  const resumes = await Resume.find({ candidateId: req.user._id }).sort({ createdAt: -1 });
  res.json({ resumes: resumes.map(_safeResume) });
};

/**
 * GET /api/resumes/:id/file
 * Streams the actual PDF file back to the client.
 * Candidate can only fetch their own; interviewers can fetch any.
 */
exports.getResumeFile = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) return res.status(404).json({ message: 'Resume not found' });

    if (
      req.user.role === 'candidate' &&
      resume.candidateId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!resume.storedPath || !fs.existsSync(resume.storedPath)) {
      return res.status(404).json({ message: 'PDF file not found on server' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${resume.originalName}"`);
    fs.createReadStream(resume.storedPath).pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE /api/resumes/:id
 * Deletes the resume record + file from disk. Candidate can only delete their own.
 */
exports.deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) return res.status(404).json({ message: 'Resume not found' });

    if (resume.candidateId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own resumes' });
    }

    // Remove file from disk
    if (resume.storedPath && fs.existsSync(resume.storedPath)) {
      fs.unlinkSync(resume.storedPath);
    }

    await resume.deleteOne();
    res.json({ message: 'Resume deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/resumes/:id
 * Returns a single resume. Candidate sees own; interviewer sees any.
 */
exports.getResume = async (req, res) => {
  const resume = await Resume.findById(req.params.id).populate('candidateId', 'name email');
  if (!resume) return res.status(404).json({ message: 'Resume not found' });

  if (
    req.user.role === 'candidate' &&
    resume.candidateId._id.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  res.json({ resume: _safeResume(resume) });
};

/**
 * GET /api/resumes/candidate/:candidateId
 * Interviewer views all resumes for a given candidate.
 */
exports.getCandidateResumes = async (req, res) => {
  const resumes = await Resume.find({ candidateId: req.params.candidateId }).sort({ createdAt: -1 });
  res.json({ resumes: resumes.map(_safeResume) });
};

// ─── shape ──────────────────────────────────────────────────────────────────

function _safeResume(r) {
  const obj = r.toObject ? r.toObject() : r;
  // Never send the raw storedPath to the client
  delete obj.storedPath;
  return obj;
}
