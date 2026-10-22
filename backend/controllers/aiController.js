const https       = require('https');
const Interview   = require('../models/Interview');
const Message     = require('../models/Message');
const CodeSession = require('../models/CodeSession');

/**
 * Calls Groq's chat completion API (no SDK needed).
 * Free tier: 30 req/min, 14,400 req/day — no billing required.
 * Get a free key at: https://console.groq.com/keys
 * Model: llama-3.1-8b-instant — fast, capable, free.
 */
function callGroq(apiKey, prompt, maxTokens = 1500) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    const req = https.request(
      {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) return reject(new Error(parsed.error.message));
            const text = parsed.choices?.[0]?.message?.content;
            if (!text) return reject(new Error('Empty response from Groq'));
            resolve(text);
          } catch (e) { reject(e); }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function requireKey(res) {
  const key = process.env.GROQ_API_KEY;
  if (!key || key === 'your_groq_api_key_here') {
    res.status(503).json({
      message: 'GROQ_API_KEY is not configured. Get a free key at https://console.groq.com/keys and add it to backend/.env',
    });
    return null;
  }
  return key;
}

// ─── POST /api/ai/questions ──────────────────────────────────────────────────
// Body: { role, topic, count? }
exports.generateQuestions = async (req, res) => {
  try {
    const apiKey = requireKey(res);
    if (!apiKey) return;

    const role  = (req.body.role  || '').trim().slice(0, 100);
    const topic = (req.body.topic || '').trim().slice(0, 100);
    const count = Math.min(Math.max(Number(req.body.count) || 7, 3), 15);

    if (!role && !topic) {
      return res.status(400).json({ message: 'Provide at least a role or topic' });
    }

    const context = [role && `Role: ${role}`, topic && `Topic: ${topic}`]
      .filter(Boolean).join(' | ');

    const prompt = `You are a senior technical interviewer. Generate ${count} sharp, specific interview questions for: ${context}.

Return ONLY a JSON array of strings — no markdown fences, no commentary, no extra text whatsoever:
["question 1", "question 2", ...]

Mix difficulty levels (easy → hard). Make questions practical and thought-provoking.`;

    const raw = await callGroq(apiKey, prompt);
    const clean = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const questions = JSON.parse(clean);

    if (!Array.isArray(questions)) throw new Error('AI returned unexpected format');
    res.json({ questions });
  } catch (err) {
    console.error('[ai] generateQuestions error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/ai/review-code ────────────────────────────────────────────────
// Body: { code, language }
exports.reviewCode = async (req, res) => {
  try {
    const apiKey = requireKey(res);
    if (!apiKey) return;

    const code     = (req.body.code     || '').slice(0, 10_000);
    const language = (req.body.language || 'code').slice(0, 40);

    if (!code.trim()) {
      return res.status(400).json({ message: 'No code to review' });
    }

    const prompt = `You are a senior software engineer doing a live technical interview code review.
Analyse the following ${language} code written by a candidate during an interview.

\`\`\`${language}
${code}
\`\`\`

Return ONLY valid JSON — no markdown fences, no extra text — with this exact structure:
{
  "verdict": "Good" | "Needs Work" | "Poor",
  "summary": "2-3 sentence overall assessment",
  "strengths": ["...", "..."],
  "issues": [
    { "severity": "high" | "medium" | "low", "description": "..." }
  ],
  "suggestions": ["...", "..."],
  "complexity": "O(?)"
}

Be concise and practical. Focus on correctness, efficiency, and code quality.`;

    const raw   = await callGroq(apiKey, prompt, 1000);
    const clean = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const review = JSON.parse(clean);

    res.json({ review });
  } catch (err) {
    console.error('[ai] reviewCode error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/ai/summary/:interviewId ──────────────────────────────────────
// Generates (or regenerates) a full post-interview summary.
// Interviewer only. Fetches interview + chat messages + code session, then
// calls Groq to produce a structured evaluation and saves it on the interview.
exports.generateInterviewSummary = async (req, res) => {
  try {
    const apiKey = requireKey(res);
    if (!apiKey) return;

    const { interviewId } = req.params;

    // ── Fetch all the data we need ──────────────────────────────────────────
    const [interview, messages, codeSession] = await Promise.all([
      Interview.findById(interviewId)
        .populate('interviewerId', 'name')
        .populate('candidateId',  'name'),
      Message.find({ roomId: { $exists: true } })
        .lean()
        .limit(0), // will re-fetch by roomId below
      CodeSession.findOne({ roomId: null }), // placeholder — re-fetch below
    ]);

    if (!interview) return res.status(404).json({ message: 'Interview not found' });

    // Auth check — only the interviewer of this interview may generate
    if (!interview.interviewerId._id.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the interviewer can generate a summary' });
    }

    // Fetch by the actual roomId
    const [chatMessages, code] = await Promise.all([
      Message.find({ roomId: interview.roomId }).sort({ createdAt: 1 }).lean(),
      CodeSession.findOne({ roomId: interview.roomId }).lean(),
    ]);

    // ── Build context sections ──────────────────────────────────────────────

    const candidateName  = interview.candidateId?.name  || 'Candidate';
    const interviewerName = interview.interviewerId?.name || 'Interviewer';

    // Duration actually spent (vs scheduled)
    let durationNote = `Scheduled: ${interview.durationMinutes} minutes.`;
    if (interview.startedAt && interview.endedAt) {
      const mins = Math.round((new Date(interview.endedAt) - new Date(interview.startedAt)) / 60000);
      durationNote += ` Actual duration: ${mins} minutes.`;
    }

    // Rubric section
    let rubricSection = 'No rubric scores were recorded.';
    if (interview.rubric?.criteria?.length) {
      const lines = interview.rubric.criteria
        .filter((c) => c.rating > 0)
        .map((c) => `  - ${c.name}: ${c.rating}/5${c.note ? ` (note: "${c.note}")` : ''}`);
      if (lines.length) {
        rubricSection = `Rubric scores (out of 5):\n${lines.join('\n')}`;
        if (interview.rubric.overallRating > 0) {
          rubricSection += `\n  Overall rating: ${interview.rubric.overallRating}/5`;
        }
        if (interview.rubric.overallNotes) {
          rubricSection += `\n  Interviewer notes: "${interview.rubric.overallNotes.slice(0, 800)}"`;
        }
      }
    }

    // Chat section — sample up to 40 messages
    let chatSection = 'No chat messages were exchanged.';
    if (chatMessages.length > 0) {
      const sample = chatMessages.slice(-40);
      chatSection = sample
        .map((m) => `  [${m.senderName}]: ${m.text.slice(0, 300)}`)
        .join('\n');
    }

    // Code section — up to 3 000 chars
    let codeSection = 'No code was written during the session.';
    if (code?.content?.trim()) {
      const snippet = code.content.trim().slice(0, 3000);
      codeSection = `Language: ${code.language || 'unknown'}\n\`\`\`\n${snippet}${code.content.length > 3000 ? '\n... (truncated)' : ''}\n\`\`\``;
    }

    // ── Build the prompt ────────────────────────────────────────────────────
    const prompt = `You are a senior engineering hiring manager. Analyse this completed technical interview and produce a structured evaluation report.

=== INTERVIEW DETAILS ===
Title: ${interview.title}
Candidate: ${candidateName}
Interviewer: ${interviewerName}
Status: ${interview.status}
${durationNote}

=== RUBRIC SCORES ===
${rubricSection}

=== CHAT TRANSCRIPT ===
${chatSection}

=== CODE WRITTEN BY CANDIDATE ===
${codeSection}

=== TASK ===
Based on ALL the evidence above, produce a thorough, fair, and specific evaluation.

Return ONLY valid JSON — absolutely no markdown fences, no preamble, no extra text:
{
  "performanceSummary": "3-5 sentence overall assessment of the candidate's performance covering technical ability, communication, and problem-solving approach",
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "weaknesses": ["specific weakness 1", "specific weakness 2"],
  "codeQuality": "2-3 sentences specifically about the code: correctness, style, efficiency, edge-case handling",
  "communication": "2-3 sentences on how clearly the candidate explained their thinking, asked clarifying questions, and responded to feedback",
  "recommendation": "Hire" | "Maybe" | "No",
  "overallScore": <integer 1-10>
}

Be specific — reference actual rubric scores, code patterns, or chat moments where possible. Do NOT invent details not present in the data.`;

    // ── Call Groq ───────────────────────────────────────────────────────────
    const raw   = await callGroq(apiKey, prompt, 1200);
    const clean = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const summary = JSON.parse(clean);

    // Validate recommendation
    if (!['Hire', 'Maybe', 'No'].includes(summary.recommendation)) {
      summary.recommendation = 'Maybe';
    }
    summary.overallScore = Math.min(10, Math.max(1, Math.round(Number(summary.overallScore) || 5)));
    summary.generatedAt  = new Date();

    // ── Persist on the interview document ───────────────────────────────────
    interview.aiSummary = summary;
    await interview.save();

    res.json({ summary });
  } catch (err) {
    console.error('[ai] generateInterviewSummary error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/ai/summary/:interviewId ───────────────────────────────────────
// Returns a previously saved summary (or 404 if none yet).
exports.getInterviewSummary = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const interview = await Interview.findById(interviewId).select('aiSummary interviewerId candidateId');
    if (!interview) return res.status(404).json({ message: 'Interview not found' });

    const isParticipant =
      interview.interviewerId.equals(req.user._id) ||
      interview.candidateId.equals(req.user._id);
    if (!isParticipant) return res.status(403).json({ message: 'Not a participant' });

    if (!interview.aiSummary?.generatedAt) {
      return res.status(404).json({ message: 'No summary generated yet' });
    }
    res.json({ summary: interview.aiSummary });
  } catch (err) {
    console.error('[ai] getInterviewSummary error:', err.message);
    res.status(500).json({ message: err.message });
  }
};
