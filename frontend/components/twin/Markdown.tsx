'use client';

import { Check, Copy } from 'lucide-react';
import { isValidElement, useState, type ReactElement, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import bash from 'highlight.js/lib/languages/bash';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { copyText } from '@/lib/clipboard';

// A focused set of languages keeps this (lazy-loaded) chunk small.
const languages = { bash, java, javascript, json, python, sql, typescript, xml, yaml };

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return textOf((node as ReactElement<{ children?: ReactNode }>).props.children);
  return '';
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const code = isValidElement(children) ? (children as ReactElement<{ className?: string; children?: ReactNode }>) : null;
  const language = /language-([\w-]+)/.exec(code?.props.className ?? '')?.[1];

  async function copy() {
    if (await copyText(textOf(children).replace(/\n$/, ''))) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <div className="code-block">
      <div className="code-block__bar">
        <span className="code-block__lang">{language ?? 'code'}</span>
        <button type="button" onClick={copy} className="code-block__copy" aria-label={copied ? 'Code copied' : 'Copy code'}>
          {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
          <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      {/* tabIndex lets keyboard users scroll long lines */}
      <pre tabIndex={0}>{children}</pre>
    </div>
  );
}

const components: Components = {
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="table-wrap" tabIndex={0}>
      <table>{children}</table>
    </div>
  ),
};

export default function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-twin">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { languages, detect: false }]]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
