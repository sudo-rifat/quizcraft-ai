import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  text: string;
  className?: string;
  block?: boolean; // if true, renders display-mode math for standalone $$...$$
}

/**
 * Renders a string that may contain LaTeX math delimiters:
 *   - Inline:   $...$  or \(...\)
 *   - Display:  $$...$$ or \[...\]
 * Everything else is rendered as plain text.
 */
export default function MathText({ text, className, block }: MathTextProps) {
  const rendered = useMemo(() => {
    if (!text) return '';

    // Split the string on math delimiters and render each segment
    // Pattern covers: $$...$$ (display), $...$ (inline), \[...\] (display), \(...\) (inline)
    const parts: Array<{ type: 'text' | 'math-inline' | 'math-display'; content: string }> = [];

    // Combined regex: order matters — $$...$$ before $...$
    const MATH_RE = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([^)]+?\\\))/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = MATH_RE.exec(text)) !== null) {
      // push text before match
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }

      const raw = match[1];
      if (raw.startsWith('$$') || raw.startsWith('\\[')) {
        const inner = raw.startsWith('$$')
          ? raw.slice(2, -2)
          : raw.slice(2, -2); // \[...\]
        parts.push({ type: 'math-display', content: inner.trim() });
      } else {
        const inner = raw.startsWith('$')
          ? raw.slice(1, -1)
          : raw.slice(2, -2); // \(...\)
        parts.push({ type: 'math-inline', content: inner.trim() });
      }

      lastIndex = match.index + raw.length;
    }

    // push remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    // Render parts to HTML strings
    return parts
      .map((part) => {
        if (part.type === 'text') {
          // escape HTML in plain text
          return part.content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        }

        try {
          return katex.renderToString(part.content, {
            displayMode: part.type === 'math-display',
            throwOnError: false,
            output: 'htmlAndMathml',
          });
        } catch {
          // fallback: show the raw latex
          return `<code>${part.content}</code>`;
        }
      })
      .join('');
  }, [text]);

  if (block) {
    return (
      <div
        className={className}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
    );
  }

  return (
    <span
      className={className}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}
