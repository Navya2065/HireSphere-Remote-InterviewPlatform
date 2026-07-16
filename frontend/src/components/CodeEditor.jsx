import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play, Loader2, Eraser, Terminal, AlertTriangle,
  Download, Wand2, Check, CloudUpload, Radio,
} from 'lucide-react';
import api from '../api/axios';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python',     label: 'Python'     },
  { id: 'java',       label: 'Java'       },
  { id: 'cpp',        label: 'C++'        },
  { id: 'csharp',     label: 'C#'         },
  { id: 'go',         label: 'Go'         },
  { id: 'rust',       label: 'Rust'       },
];

const STARTERS = {
  javascript: `// JavaScript\nconsole.log('Hello from HireSphere');`,
  typescript: `// TypeScript\nconst name: string = 'HireSphere';\nconsole.log('Hello ' + name);`,
  python:     `# Python\nprint('Hello from HireSphere')`,
  java:       `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello from HireSphere");\n  }\n}`,
  cpp:        `#include <iostream>\nint main() { std::cout << "Hello from HireSphere\\n"; }`,
  csharp:     `using System;\nclass Main { static void Main() { Console.WriteLine("Hello from HireSphere"); } }`,
  go:         `package main\nimport "fmt"\nfunc main() { fmt.Println("Hello from HireSphere") }`,
  rust:       `fn main() { println!("Hello from HireSphere"); }`,
};

const EXTENSIONS = {
  javascript: 'js', typescript: 'ts', python: 'py', java: 'java',
  cpp: 'cpp', csharp: 'cs', go: 'go', rust: 'rs',
};

// ─── Language snippets ────────────────────────────────────────────────────────
// Registered once per language via monaco.languages.registerCompletionItemProvider

const SNIPPETS = {
  java: [
    {
      label: 'psvm',
      detail: 'public static void main',
      insert: 'public static void main(String[] args) {\n\t$0\n}',
    },
    {
      label: 'sout',
      detail: 'System.out.println',
      insert: 'System.out.println($0);',
    },
    {
      label: 'soutv',
      detail: 'System.out.println variable',
      insert: 'System.out.println("$1 = " + $1);$0',
    },
    {
      label: 'fori',
      detail: 'for loop with index',
      insert: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}',
    },
    {
      label: 'foreach',
      detail: 'enhanced for loop',
      insert: 'for (${1:Type} ${2:item} : ${3:collection}) {\n\t$0\n}',
    },
    {
      label: 'class',
      detail: 'public class',
      insert: 'public class ${1:ClassName} {\n\t$0\n}',
    },
    {
      label: 'main',
      detail: 'Java main class boilerplate',
      insert: 'public class ${1:Main} {\n\tpublic static void main(String[] args) {\n\t\t$0\n\t}\n}',
    },
  ],
  python: [
    {
      label: 'def',
      detail: 'function definition',
      insert: 'def ${1:function_name}(${2:args}):\n\t$0',
    },
    {
      label: 'class',
      detail: 'class definition',
      insert: 'class ${1:ClassName}:\n\tdef __init__(self${2:, args}):\n\t\t$0',
    },
    {
      label: 'main',
      detail: 'if __name__ == "__main__"',
      insert: 'if __name__ == "__main__":\n\t$0',
    },
    {
      label: 'fori',
      detail: 'for range loop',
      insert: 'for ${1:i} in range(${2:n}):\n\t$0',
    },
    {
      label: 'forin',
      detail: 'for in loop',
      insert: 'for ${1:item} in ${2:iterable}:\n\t$0',
    },
    {
      label: 'try',
      detail: 'try/except block',
      insert: 'try:\n\t$1\nexcept ${2:Exception} as ${3:e}:\n\t$0',
    },
    {
      label: 'lc',
      detail: 'list comprehension',
      insert: '[${1:expr} for ${2:item} in ${3:iterable}]$0',
    },
    {
      label: 'print',
      detail: 'print statement',
      insert: 'print(${1:value})$0',
    },
  ],
  cpp: [
    {
      label: 'main',
      detail: 'main function',
      insert: 'int main() {\n\t$0\n\treturn 0;\n}',
    },
    {
      label: 'cout',
      detail: 'std::cout',
      insert: 'std::cout << ${1:value} << std::endl;$0',
    },
    {
      label: 'cin',
      detail: 'std::cin',
      insert: 'std::cin >> ${1:variable};$0',
    },
    {
      label: 'fori',
      detail: 'for loop',
      insert: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}',
    },
    {
      label: 'class',
      detail: 'class definition',
      insert: 'class ${1:ClassName} {\npublic:\n\t${1:ClassName}() {}\n\t$0\n};',
    },
    {
      label: 'inc',
      detail: '#include headers',
      insert: '#include <${1:iostream}>\n$0',
    },
    {
      label: 'vec',
      detail: 'std::vector',
      insert: 'std::vector<${1:int}> ${2:v};$0',
    },
  ],
  csharp: [
    {
      label: 'main',
      detail: 'Main method',
      insert: 'static void Main(string[] args) {\n\t$0\n}',
    },
    {
      label: 'cw',
      detail: 'Console.WriteLine',
      insert: 'Console.WriteLine($0);',
    },
    {
      label: 'cr',
      detail: 'Console.ReadLine',
      insert: 'Console.ReadLine();$0',
    },
    {
      label: 'fori',
      detail: 'for loop',
      insert: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}',
    },
    {
      label: 'foreach',
      detail: 'foreach loop',
      insert: 'foreach (${1:var} ${2:item} in ${3:collection}) {\n\t$0\n}',
    },
    {
      label: 'class',
      detail: 'class definition',
      insert: 'public class ${1:ClassName} {\n\t$0\n}',
    },
    {
      label: 'prop',
      detail: 'auto property',
      insert: 'public ${1:string} ${2:PropertyName} { get; set; }$0',
    },
  ],
  go: [
    {
      label: 'main',
      detail: 'main function',
      insert: 'func main() {\n\t$0\n}',
    },
    {
      label: 'func',
      detail: 'function',
      insert: 'func ${1:name}(${2:args}) ${3:returnType} {\n\t$0\n}',
    },
    {
      label: 'fmt',
      detail: 'fmt.Println',
      insert: 'fmt.Println($0)',
    },
    {
      label: 'fori',
      detail: 'for loop',
      insert: 'for ${1:i} := 0; ${1:i} < ${2:n}; ${1:i}++ {\n\t$0\n}',
    },
    {
      label: 'forr',
      detail: 'range loop',
      insert: 'for ${1:i}, ${2:v} := range ${3:slice} {\n\t$0\n}',
    },
    {
      label: 'struct',
      detail: 'struct definition',
      insert: 'type ${1:Name} struct {\n\t${2:Field} ${3:Type}\n\t$0\n}',
    },
    {
      label: 'err',
      detail: 'error check',
      insert: 'if err != nil {\n\t$0\n}',
    },
  ],
  rust: [
    {
      label: 'main',
      detail: 'main function',
      insert: 'fn main() {\n\t$0\n}',
    },
    {
      label: 'fn',
      detail: 'function',
      insert: 'fn ${1:name}(${2:args}) -> ${3:ReturnType} {\n\t$0\n}',
    },
    {
      label: 'println',
      detail: 'println! macro',
      insert: 'println!("${1:{}}", ${2:value});$0',
    },
    {
      label: 'fori',
      detail: 'for range loop',
      insert: 'for ${1:i} in 0..${2:n} {\n\t$0\n}',
    },
    {
      label: 'struct',
      detail: 'struct definition',
      insert: 'struct ${1:Name} {\n\t${2:field}: ${3:Type},\n\t$0\n}',
    },
    {
      label: 'impl',
      detail: 'impl block',
      insert: 'impl ${1:Type} {\n\t$0\n}',
    },
    {
      label: 'match',
      detail: 'match expression',
      insert: 'match ${1:value} {\n\t${2:pattern} => ${3:result},\n\t_ => $0,\n}',
    },
  ],
};

// Track which languages have already had their providers registered
const registeredLanguages = new Set();

function registerSnippets(monaco) {
  Object.entries(SNIPPETS).forEach(([lang, snippets]) => {
    if (registeredLanguages.has(lang)) return;
    registeredLanguages.add(lang);

    monaco.languages.registerCompletionItemProvider(lang, {
      provideCompletionItems(model, position) {
        const word  = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber:   position.lineNumber,
          startColumn:     word.startColumn,
          endColumn:       word.endColumn,
        };
        return {
          suggestions: snippets.map((s) => ({
            label:            s.label,
            kind:             monaco.languages.CompletionItemKind.Snippet,
            detail:           s.detail,
            insertText:       s.insert,
            insertTextRules:  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })),
        };
      },
    });
  });
}

/**
 * Props:
 *   socket      – Socket.io instance
 *   roomId      – current room ID
 *   connected   – boolean socket connection state
 *   readOnly    – boolean; when true the interviewer sees a live read-only view
 */
export default function CodeEditor({ socket, roomId, connected, readOnly = false }) {
  const [language,   setLanguage]   = useState('javascript');
  const [running,    setRunning]    = useState(false);
  const [output,     setOutput]     = useState(null);
  const [saveState,  setSaveState]  = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [peerActive, setPeerActive] = useState(false);  // peer is typing right now

  // Refs that don't trigger re-renders
  const editorRef          = useRef(null);
  const monacoRef          = useRef(null);
  const isApplyingRemote   = useRef(false); // guard against echo-loop
  const pendingRemote      = useRef(null);  // content received before editor mounted
  const debounceRef        = useRef(null);
  const savedTimerRef      = useRef(null);
  const peerTimerRef       = useRef(null);

  // ── Socket wiring ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    /**
     * Apply remote content imperatively.
     * Language is changed via model replacement so content + language switch
     * happen atomically — avoids Monaco resetting content when language prop
     * changes asynchronously via setState.
     */
    const applyRemote = (content, lang) => {
      const safeContent = content ?? '';
      const safeLang    = lang || 'javascript';

      if (!editorRef.current || !monacoRef.current) {
        // Editor not mounted yet — stash for later
        pendingRemote.current = { content: safeContent, language: safeLang };
        return;
      }

      isApplyingRemote.current = true;

      const monaco = monacoRef.current;
      const editor = editorRef.current;
      const currentModel = editor.getModel();

      if (currentModel && currentModel.getLanguageId() !== safeLang) {
        // Replace the model so language + content change atomically
        const newModel = monaco.editor.createModel(safeContent, safeLang);
        editor.setModel(newModel);
        if (currentModel) currentModel.dispose();
      } else {
        editor.setValue(safeContent);
      }

      // Keep React language state in sync (for toolbar display)
      setLanguage(safeLang);

      isApplyingRemote.current = false;
    };

    // Full state sent when joining the room
    const onCodeState = ({ content, language: l }) => {
      applyRemote(content || STARTERS[l || 'javascript'] || '', l);
    };

    // Incremental update from the other participant
    const onCodeUpdate = ({ content, language: l }) => {
      applyRemote(content, l);
      setPeerActive(true);
      clearTimeout(peerTimerRef.current);
      peerTimerRef.current = setTimeout(() => setPeerActive(false), 1500);
    };

    // Language-only change — treat same as a full update to keep model in sync
    const onCodeLanguage = ({ language: l }) => {
      if (!l) return;
      const currentContent = editorRef.current?.getValue() ?? '';
      applyRemote(currentContent, l);
    };

    const onCodeOutput = (result) => setOutput(result);

    socket.on('code-state',    onCodeState);
    socket.on('code-update',   onCodeUpdate);
    socket.on('code-language', onCodeLanguage);
    socket.on('code-output',   onCodeOutput);

    return () => {
      socket.off('code-state',    onCodeState);
      socket.off('code-update',   onCodeUpdate);
      socket.off('code-language', onCodeLanguage);
      socket.off('code-output',   onCodeOutput);
      clearTimeout(peerTimerRef.current);
    };
  }, [socket]);

  // ── Flash "Saved" in the toolbar ──────────────────────────────────────────
  const flashSaved = () => {
    setSaveState('saved');
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaveState('idle'), 1500);
  };

  // ── Local keystroke → debounce → emit ────────────────────────────────────
  const onLocalChange = (value) => {
    // Guard: if we applied remote content, Monaco fires onChange synchronously.
    // isApplyingRemote is still true at this point → skip.
    if (isApplyingRemote.current) return;
    // Read-only view should never emit local changes
    if (readOnly) return;
    if (!socket || !connected) return;

    setSaveState('saving');
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      socket.emit('code-update', { roomId, content: value ?? '', language });
      flashSaved();
    }, 200);
  };

  // ── Language selector ─────────────────────────────────────────────────────
  const onLanguageChange = (e) => {
    if (readOnly) return;
    const l = e.target.value;

    // Decide new content: keep existing unless it's still a starter snippet
    const current = editorRef.current?.getValue() ?? '';
    const newContent = (!current || Object.values(STARTERS).includes(current))
      ? (STARTERS[l] || '')
      : current;

    // Switch the model atomically (language + content together)
    if (editorRef.current && monacoRef.current) {
      isApplyingRemote.current = true;
      const oldModel = editorRef.current.getModel();
      const newModel = monacoRef.current.editor.createModel(newContent, l);
      editorRef.current.setModel(newModel);
      if (oldModel) oldModel.dispose();
      isApplyingRemote.current = false;
    }

    setLanguage(l);

    // Broadcast BOTH language and full content so interviewer stays in sync
    if (socket && connected) {
      socket.emit('code-update', { roomId, content: newContent, language: l });
    }
  };

  // ── Run code ──────────────────────────────────────────────────────────────
  const runCode = async () => {
    if (running || readOnly) return;
    const content = editorRef.current?.getValue() ?? '';
    if (!content.trim()) return;

    setRunning(true);
    setOutput({ stdout: '', stderr: '', exitCode: null, running: true });
    try {
      const { data } = await api.post('/code/execute', { roomId, language, content });
      setOutput(data.result);
    } catch (err) {
      setOutput({
        stdout:   '',
        stderr:   err?.response?.data?.message || err.message || 'Execution failed',
        exitCode: -1,
      });
    } finally {
      setRunning(false);
    }
  };

  // ── Editor mount ──────────────────────────────────────────────────────────
  const onEditorMount = (editor, monaco) => {
    editorRef.current  = editor;
    monacoRef.current  = monaco;

    // Register language snippets (once per language, globally)
    registerSnippets(monaco);

    // Apply any content that arrived via socket before the editor was ready
    if (pendingRemote.current) {
      const { content, language: lang } = pendingRemote.current;
      pendingRemote.current = null;

      isApplyingRemote.current = true;
      const oldModel = editor.getModel();
      const newModel = monaco.editor.createModel(content, lang || 'javascript');
      editor.setModel(newModel);
      if (oldModel) oldModel.dispose();
      isApplyingRemote.current = false;

      setLanguage(lang || 'javascript');
    }

    if (!readOnly) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runCode());
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,  () => flashSaved());
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatCode   = () => editorRef.current?.getAction('editor.action.formatDocument')?.run();
  const clearOutput  = () => setOutput(null);
  const downloadCode = () => {
    const content = editorRef.current?.getValue() ?? '';
    const ext     = EXTENSIONS[language] || 'txt';
    const blob    = new Blob([content], { type: 'text/plain' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href     = url;
    a.download = `hiresphere-${roomId.slice(0, 6)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col bg-ink-900/60">

      {/* Read-only live banner (interviewer) */}
      {readOnly && (
        <div className={`flex items-center justify-between border-b border-white/5 px-3 py-1.5 text-xs transition
          ${peerActive
            ? 'bg-neon-lime/5 border-neon-lime/20'
            : 'bg-ink-800/60'
          }`}
        >
          <span className={`inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider
            ${peerActive ? 'text-neon-lime' : 'text-zinc-500'}`}
          >
            <Radio size={11} className={peerActive ? 'animate-pulse' : ''} />
            {peerActive ? 'Candidate is typing…' : 'Live code view'}
          </span>
          <span className="text-zinc-500">read-only</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
        <div className="flex items-center gap-2">
          <label htmlFor="lang-sel" className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Lang
          </label>
          <select
            id="lang-sel"
            value={language}
            onChange={onLanguageChange}
            disabled={readOnly}
            className="rounded-md border border-ink-500 bg-ink-800 px-2 py-1 text-xs text-zinc-100 focus:border-neon-cyan focus:outline-none disabled:opacity-50"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>

          {!readOnly && <SaveIndicator state={saveState} connected={connected} />}
        </div>

        <div className="flex items-center gap-1">
          {!readOnly && (
            <>
              <button onClick={formatCode} className="btn-ghost !px-2 !py-1 text-xs" title="Format (Shift+Alt+F)">
                <Wand2 size={13} /> Format
              </button>
              <button onClick={downloadCode} className="btn-ghost !px-2 !py-1 text-xs" title="Download">
                <Download size={13} />
              </button>
              <button
                onClick={clearOutput}
                disabled={!output}
                className="btn-ghost !px-2 !py-1 text-xs disabled:opacity-40"
                title="Clear output"
              >
                <Eraser size={13} />
              </button>
              <button
                onClick={runCode}
                disabled={running}
                className="btn-accent !px-3 !py-1 text-xs"
                title="Run (Ctrl/Cmd + Enter)"
              >
                {running
                  ? <><Loader2 size={13} className="animate-spin" /> Running…</>
                  : <><Play size={13} /> Run</>
                }
              </button>
            </>
          )}

          {readOnly && (
            <button onClick={downloadCode} className="btn-ghost !px-2 !py-1 text-xs" title="Download candidate's code">
              <Download size={13} /> Download
            </button>
          )}
        </div>
      </div>

      {/* Monaco Editor — UNCONTROLLED (no value prop) */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
          defaultValue={STARTERS.javascript}
          onChange={onLocalChange}
          onMount={onEditorMount}
          theme="vs-dark"
          options={{
            readOnly,
            minimap:               { enabled: false },
            fontSize:              13,
            fontFamily:            'JetBrains Mono, ui-monospace, monospace',
            wordWrap:              'on',
            scrollBeyondLastLine:  false,
            automaticLayout:       true,
            tabSize:               2,
            smoothScrolling:       true,
            padding:               { top: 10, bottom: 10 },
            // Visual hints that this is a live read-only feed
            renderLineHighlight:   readOnly ? 'none' : 'line',
            cursorStyle:           readOnly ? 'block' : 'line',
            cursorBlinking:        readOnly ? 'solid'  : 'blink',
          }}
        />
      </div>

      {/* Stats footer (candidate only) */}
      {!readOnly && (
        <div className="flex items-center justify-between border-t border-white/5 bg-ink-900/80 px-3 py-1.5 text-[11px] text-zinc-500">
          <span>{language}</span>
          <span className="font-mono">
            <kbd className="rounded border border-ink-500 bg-ink-800 px-1">⌘</kbd>
            <kbd className="ml-0.5 rounded border border-ink-500 bg-ink-800 px-1">↵</kbd>
            <span className="ml-1.5">run</span>
          </span>
        </div>
      )}

      {output && <OutputPanel output={output} onClear={clearOutput} />}
    </div>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function SaveIndicator({ state, connected }) {
  if (!connected) return <span className="text-[11px] text-zinc-500">Offline</span>;
  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
        <CloudUpload size={11} className="animate-pulse" /> Syncing…
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-neon-lime">
        <Check size={11} /> Synced
      </span>
    );
  }
  return <span className="text-[11px] text-zinc-500">Ready</span>;
}

function OutputPanel({ output, onClear }) {
  const hasErr = !!output.stderr;
  const exit   = output.exitCode;

  return (
    <div className="shrink-0 border-t border-white/5 bg-ink-900">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          <Terminal size={13} className="text-neon-cyan" />
          <span className="font-semibold uppercase tracking-wider text-zinc-400">Output</span>
          {output.ranBy && (
            <span className="text-zinc-500">· ran by {output.ranBy.name}</span>
          )}
          {exit !== null && exit !== undefined && (
            <span className={`pill ${hasErr || exit !== 0 ? 'pill-pink' : 'pill-lime'}`}>
              exit {exit}
            </span>
          )}
        </div>
        <button onClick={onClear} className="btn-ghost !px-1.5 !py-0.5 text-xs">
          <Eraser size={11} />
        </button>
      </div>
      <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words px-3 pb-3 font-mono text-xs leading-relaxed text-zinc-200">
        {output.running && !output.stdout && !output.stderr && (
          <span className="text-zinc-500">Running…</span>
        )}
        {output.stdout && <span>{output.stdout}</span>}
        {output.stderr && (
          <span className="text-rose-400">
            {output.stdout ? '\n' : ''}
            <span className="inline-flex items-center gap-1"><AlertTriangle size={11} /> stderr</span>
            {'\n'}{output.stderr}
          </span>
        )}
        {!output.running && !output.stdout && !output.stderr && (
          <span className="text-zinc-500">(no output)</span>
        )}
      </pre>
    </div>
  );
}
