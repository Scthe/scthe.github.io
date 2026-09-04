import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import { visit } from 'unist-util-visit';
import katex from 'katex';
import picocolors from 'picocolors';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Lints the LaTeX math in the blog posts under `content/blog` with KaTeX.
 *
 * Runs the same parsing pipeline as the build (`remark-math`), then validates
 * every math expression with `throwOnError: true` (the build sets
 * `throwOnError: false`, so invalid input is silently swallowed there).
 * Strict-mode warnings (e.g. unrecognized Unicode characters) are also
 * reported.
 */
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = path.join(repoRoot, 'content', 'blog');

const parser = unified().use(remarkParse).use(remarkMath);

type MathNode = {
  type: 'inlineMath' | 'math';
  value: string;
  position?: {
    start?: { line?: number; offset?: number };
  };
};

function walkMathFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkMathFiles(full));
    } else if (/\.(md|mdx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

type Issue = { kind: 'error' | 'warning'; message: string };

function validateLatex(value: string, displayMode: boolean): Issue[] {
  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (msg: unknown) => warnings.push(String(msg));

  let error: string | null = null;
  try {
    katex.renderToString(value, {
      throwOnError: true,
      strict: 'warn',
      displayMode,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  } finally {
    console.warn = origWarn;
  }

  const issues: Issue[] = [];
  if (error) {
    issues.push({ kind: 'error', message: error });
  }
  // KaTeX may emit the same strict warning more than once per expression.
  for (const warning of [...new Set(warnings)]) {
    issues.push({ kind: 'warning', message: warning });
  }
  return issues;
}

function snippet(value: string): string {
  return value.length > 140 ? `${value.slice(0, 140)}\u2026` : value;
}

let fileCount = 0;
let mathCount = 0;
let errorCount = 0;
let warningCount = 0;

for (const file of walkMathFiles(contentRoot)) {
  const text = readFileSync(file, 'utf8');
  const tree = parser.parse(text);

  let fileErrors = 0;
  let fileWarnings = 0;
  const rel = path.relative(repoRoot, file).replace(/\\/g, '/');

  visit(tree, (node) => {
    if (node.type !== 'inlineMath' && node.type !== 'math') return;
    mathCount++;

    const mathNode = node as MathNode;
    const value = mathNode.value ?? '';
    const displayMode = mathNode.type === 'math';

    for (const issue of validateLatex(value, displayMode)) {
      if (issue.kind === 'error') {
        errorCount++;
        fileErrors++;
      } else {
        warningCount++;
        fileWarnings++;
      }

      const label =
        issue.kind === 'error'
          ? picocolors.red('ERROR')
          : picocolors.yellow('WARNING');
      const line = mathNode.position?.start?.line ?? 0;
      console.log(`[${rel}:${line}] ${mathNode.type}: ${snippet(value)}`);
      console.log(`   ${label}: ${issue.message.split('\n')[0]}`);
    }
  });

  fileCount++;
  if (fileErrors + fileWarnings > 0) {
    console.log(
      `== ${fileErrors} error(s), ${fileWarnings} warning(s) in ${path.basename(file)} ==`,
    );
  }
}

console.log(
  `\nScanned ${fileCount} files, ${mathCount} math expressions. ` +
    `${picocolors.red(`${errorCount} error(s)`)}, ` +
    `${picocolors.yellow(`${warningCount} warning(s)`)}.`,
);
process.exit(errorCount > 0 ? 1 : 0);
