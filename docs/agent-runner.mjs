#!/usr/bin/env node
// GPT-6.1-SOL(max) coding-agent runner for the Iron Dawn project.
// Uses the token5u Responses API through a tool loop. API key is read from env.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';

const ROOT = path.resolve(process.env.AGENT_ROOT || process.cwd());
const STATE = path.resolve(ROOT, process.env.AGENT_STATE_DIR || '.agent');
const API_URL = process.env.AGENT_API_URL || 'https://api.token5u.cn/v1/responses';
const MODEL = process.env.AGENT_MODEL || 'gpt-6.1-sol';
const EFFORT = process.env.AGENT_REASONING || 'max';
const MAX_ITER = Number(process.env.AGENT_MAX_ITER || 90);
const MAX_WALL_MS = Number(process.env.AGENT_MAX_WALL_MIN || 210) * 60 * 1000;
const API_KEY = process.env.GPT_6_SOL_API_KEY;

if (!API_KEY) {
  console.error('GPT_6_SOL_API_KEY is missing');
  process.exit(2);
}

const SKIP_DIRS = new Set(['node_modules', '.git', '.agent', '.npm-cache', '.codex-home', 'dist', 'tmp']);
const startedAt = Date.now();

fs.mkdirSync(STATE, { recursive: true });
const logStream = fs.createWriteStream(path.join(STATE, 'run.log'), { flags: 'a' });
const transcript = fs.createWriteStream(path.join(STATE, 'transcript.jsonl'), { flags: 'a' });

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  logStream.write(line + '\n');
}

function saveJson(name, value) {
  fs.writeFileSync(path.join(STATE, name), JSON.stringify(value, null, 2));
}

function isInsideRoot(p) {
  const rel = path.relative(ROOT, p);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function resolveSafe(p) {
  const resolved = path.resolve(ROOT, p);
  if (!isInsideRoot(resolved)) throw new Error(`Path escapes workspace: ${p}`);
  return resolved;
}

function rel(p) {
  return path.relative(ROOT, p).replaceAll('\\', '/');
}

async function listTree(dir, depth = 2) {
  const base = resolveSafe(dir);
  const out = [];
  async function walk(current, d) {
    let entries;
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch (error) {
      out.push(`${rel(current) || '.'} [unreadable: ${error.code}]`);
      return;
    }
    entries.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      const r = rel(full);
      if (entry.isDirectory()) {
        out.push(`${r}/`);
        if (d > 0) await walk(full, d - 1);
      } else {
        let size = 0;
        try { size = (await fsp.stat(full)).size; } catch {}
        out.push(`${r} (${size}b)`);
      }
      if (out.length > 900) { out.push('... [truncated]'); return; }
    }
  }
  await walk(base, Math.max(0, Math.min(depth, 5)));
  return out.join('\n') || '(empty)';
}

function truncate(text, max = 45000) {
  if (text.length <= max) return text;
  return `${text.slice(0, max * 0.35)}\n... [${text.length - max} chars omitted] ...\n${text.slice(-max * 0.65)}`;
}

async function readTextFile(p, offset = 1, limit = 2200) {
  const file = resolveSafe(p);
  const data = await fsp.readFile(file, 'utf8');
  const lines = data.split(/\r?\n/);
  const start = Math.max(0, Number(offset) - 1);
  const end = Math.min(lines.length, start + Number(limit));
  return truncate(`File: ${rel(file)} (${lines.length} lines)\n` + lines.slice(start, end).map((line, i) => `${start + i + 1}: ${line}`).join('\n'), 90000);
}

async function writeTextFile(p, content) {
  const file = resolveSafe(p);
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, content, 'utf8');
  return `Wrote ${rel(file)} (${Buffer.byteLength(content, 'utf8')} bytes).`;
}

async function replaceText(p, oldText, newText, replaceAll = false) {
  const file = resolveSafe(p);
  const content = await fsp.readFile(file, 'utf8');
  const count = content.split(oldText).length - 1;
  if (count === 0) return `ERROR: old_text was not found in ${rel(file)}.`;
  if (count > 1 && !replaceAll) return `ERROR: old_text matched ${count} times. Provide more context or replace_all=true.`;
  const next = replaceAll ? content.split(oldText).join(newText) : content.replace(oldText, newText);
  await fsp.writeFile(file, next, 'utf8');
  return `Replaced ${replaceAll ? count : 1} occurrence(s) in ${rel(file)}.`;
}

function runCommand(command, timeoutSeconds = 180) {
  return new Promise((resolve) => {
    const outFile = path.join(STATE, `cmd-${Date.now()}.log`);
    const escaped = outFile.replaceAll("'", "''");
    const wrapped = `$ErrorActionPreference = 'Continue'; [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); $OutputEncoding = [System.Text.UTF8Encoding]::new($false); & {\n${command}\n} 2>&1 | Out-File -FilePath '${escaped}' -Encoding utf8; exit $LASTEXITCODE`;
    const psExe = [
      path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      'powershell.exe'
    ].find(candidate => candidate === 'powershell.exe' || fs.existsSync(candidate)) || 'powershell.exe';
    const child = spawn(psExe, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', wrapped], {
      cwd: ROOT,
      stdio: 'ignore',
      windowsHide: true,
      env: { ...process.env, GIT_PAGER: 'cat', PAGER: 'cat' }
    });
    let settled = false;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill('SIGKILL'); } catch {}
    }, Math.max(10, Math.min(timeoutSeconds, 900)) * 1000);
    child.on('error', async (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(`COMMAND ERROR: ${error.message}`);
    });
    child.on('exit', async (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      let output = '';
      try { output = await fsp.readFile(outFile, 'utf8'); } catch {}
      try { await fsp.unlink(outFile); } catch {}
      const header = timedOut ? `COMMAND TIMED OUT after ${timeoutSeconds}s` : `EXIT CODE: ${code}`;
      resolve(truncate(`${header}\n$ ${command}\n\n${output || '(no output)'}`, 50000));
    });
  });
}

const tools = [
  {
    type: 'function',
    name: 'list_files',
    description: 'List workspace files. Use this before reading or editing unfamiliar areas.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory relative to the project root.' },
        depth: { type: 'integer', description: 'Recursion depth (0-5).' }
      },
      required: ['path'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'read_file',
    description: 'Read a UTF-8 text file with line numbers.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        offset: { type: 'integer', description: '1-based first line.' },
        limit: { type: 'integer', description: 'Maximum number of lines.' }
      },
      required: ['path'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'write_file',
    description: 'Create or fully overwrite a UTF-8 text file. Parent directories are created.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        content: { type: 'string', description: 'Complete file contents. Never use placeholders.' }
      },
      required: ['path', 'content'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'replace_text',
    description: 'Replace exact text in a file. Prefer this for targeted edits.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        old_text: { type: 'string' },
        new_text: { type: 'string' },
        replace_all: { type: 'boolean' }
      },
      required: ['path', 'old_text', 'new_text'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'run_command',
    description: 'Run a PowerShell command from the project root. Use for dependency checks, static checks, and automated tests. Output is captured. Avoid starting long-lived dev servers.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string' },
        timeout_seconds: { type: 'integer', description: 'Default 180, max 900.' }
      },
      required: ['command'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'finish',
    description: 'Finish only after the requested work is implemented and verified. Summarize what was built, how it was tested, and any known limitations.',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string' }
      },
      required: ['summary'],
      additionalProperties: false
    }
  }
];

async function executeTool(call) {
  let args = {};
  try {
    args = JSON.parse(call.arguments || '{}');
  } catch (error) {
    return `ERROR: invalid JSON arguments: ${error.message}`;
  }
  log(`tool ${call.name} ${JSON.stringify(args).slice(0, 500)}`);
  try {
    switch (call.name) {
      case 'list_files': return await listTree(args.path || '.', args.depth ?? 2);
      case 'read_file': return await readTextFile(args.path, args.offset ?? 1, args.limit ?? 2200);
      case 'write_file': return await writeTextFile(args.path, args.content ?? '');
      case 'replace_text': return await replaceText(args.path, args.old_text ?? '', args.new_text ?? '', Boolean(args.replace_all));
      case 'run_command': return await runCommand(args.command ?? '', args.timeout_seconds ?? 180);
      case 'finish': return 'FINISHED';
      default: return `ERROR: unknown tool ${call.name}`;
    }
  } catch (error) {
    return `ERROR: ${error.message}`;
  }
}

async function callModel(input) {
  const body = {
    model: MODEL,
    reasoning: { effort: EFFORT },
    instructions: process.env.AGENT_INSTRUCTIONS || 'You are a senior game engineer and technical artist working in a local workspace.',
    input,
    tools,
    tool_choice: 'auto',
    parallel_tool_calls: true,
    max_output_tokens: Number(process.env.AGENT_MAX_OUTPUT || 16000),
    store: false,
    text: { verbosity: 'medium' }
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.AGENT_API_TIMEOUT_MS || 180000));
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}`, Connection: 'close' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`API ${response.status}: ${text.slice(0, 1200)}`);
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

const initialPrompt = process.env.AGENT_PROMPT || await fsp.readFile(path.join(STATE, 'prompt.txt'), 'utf8');
const instructions = process.env.AGENT_INSTRUCTIONS || await fsp.readFile(path.join(STATE, 'instructions.txt'), 'utf8').catch(() => 'You are a senior game engineer and technical artist working in a local workspace.');

const conversation = [
  {
    role: 'user',
    content: [{ type: 'input_text', text: initialPrompt }]
  }
];

saveJson('status.json', {
  state: 'running', model: MODEL, effort: EFFORT, startedAt: new Date().toISOString(), iteration: 0,
  root: ROOT
});
log(`agent start model=${MODEL} effort=${EFFORT} root=${ROOT}`);

let finalSummary = null;
for (let iteration = 1; iteration <= MAX_ITER; iteration++) {
  if (Date.now() - startedAt > MAX_WALL_MS) {
    log('wall clock budget exceeded');
    break;
  }
  log(`--- iteration ${iteration} ---`);
  let response;
  try {
    response = await callModel(conversation);
  } catch (error) {
    log(`API error: ${error.message}`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    continue;
  }
  const usage = response.usage || {};
  log(`response ${response.id} status=${response.status} input=${usage.input_tokens || 0} output=${usage.output_tokens || 0} reasoning=${usage.output_tokens_details?.reasoning_tokens || 0}`);
  transcript.write(JSON.stringify({ type: 'response', iteration, id: response.id, usage, status: response.status, output: response.output }) + '\n');

  const output = response.output || [];
  const assistantText = output
    .filter(item => item.type === 'message')
    .flatMap(item => item.content || [])
    .filter(part => part.type === 'output_text')
    .map(part => part.text)
    .join('\n')
    .trim();
  if (assistantText) {
    log(`assistant: ${assistantText.slice(0, 1500)}`);
    conversation.push({ role: 'assistant', content: [{ type: 'output_text', text: assistantText }] });
  }

  // Keep the assistant's function-call items in the conversation before tool outputs.
  const calls = output.filter(item => item.type === 'function_call');
  for (const call of calls) {
    conversation.push({ type: 'function_call', call_id: call.call_id, name: call.name, arguments: call.arguments });
  }

  if (!calls.length) {
    if (response.status === 'incomplete') {
      conversation.push({ role: 'user', content: [{ type: 'input_text', text: 'Your previous response was cut off. Continue the implementation from where you left off. Use tools; do not restart.' }] });
      continue;
    }
    if (assistantText) {
      conversation.push({ role: 'user', content: [{ type: 'input_text', text: 'Continue. Do not stop with a plan or summary. Implement the remaining work with tools, test it, then call finish only when the acceptance criteria are actually met.' }] });
      continue;
    }
    conversation.push({ role: 'user', content: [{ type: 'input_text', text: 'Continue using tools. Do not return an empty response.' }] });
    continue;
  }

  let finished = false;
  for (const call of calls) {
    const result = await executeTool(call);
    transcript.write(JSON.stringify({ type: 'tool_result', call_id: call.call_id, name: call.name, result: truncate(result, 4000) }) + '\n');
    conversation.push({ type: 'function_call_output', call_id: call.call_id, output: truncate(result, 60000) });
    if (call.name === 'finish') {
      finished = true;
      try {
        const parsed = JSON.parse(call.arguments || '{}');
        finalSummary = parsed.summary || 'Finished';
      } catch {
        finalSummary = call.arguments || 'Finished';
      }
      log(`FINISH: ${finalSummary}`);
    }
  }
  saveJson('status.json', {
    state: finished ? 'finished' : 'running', model: MODEL, effort: EFFORT,
    startedAt: new Date(startedAt).toISOString(), updatedAt: new Date().toISOString(),
    iteration, lastResponseId: response.id, lastUsage: usage, finalSummary
  });
  if (finished) break;
}

if (!finalSummary) {
  finalSummary = 'Agent stopped without calling finish. Inspect the workspace and transcript.';
  log(`no finish summary. ${finalSummary}`);
}
saveJson('final.json', { summary: finalSummary, finishedAt: new Date().toISOString(), model: MODEL, effort: EFFORT });
saveJson('status.json', {
  state: 'finished', model: MODEL, effort: EFFORT, startedAt: new Date(startedAt).toISOString(),
  updatedAt: new Date().toISOString(), finalSummary
});
log('agent end');
