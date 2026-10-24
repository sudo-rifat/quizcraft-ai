import React from 'react';
import MathText from './MathText';

function renderInlineFormatting(text: string, keyPrefix: string) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);

  return segments.map((segment, index) => {
    const key = `${keyPrefix}-${index}`;
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return (
        <strong key={key} className="font-headline font-semibold text-on-surface">
          <MathText text={segment.slice(2, -2)} />
        </strong>
      );
    }

    return <MathText key={key} text={segment} />;
  });
}

export default function FormattedAiResponse({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const content = paragraph.join('\n');
    blocks.push(
      <p key={`paragraph-${blocks.length}`} className="text-xs leading-relaxed">
        {renderInlineFormatting(content, `paragraph-${blocks.length}`)}
      </p>
    );
    paragraph = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push(
        <h4
          key={`heading-${index}`}
          className="pt-1 font-headline text-xs font-bold text-on-surface"
        >
          {renderInlineFormatting(heading[2], `heading-${index}`)}
        </h4>
      );
      return;
    }

    if (!line) {
      flushParagraph();
      return;
    }

    const bullet = line.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      blocks.push(
        <div key={`bullet-${index}`} className="flex items-start gap-2 pl-1">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <p className="min-w-0 flex-1 text-xs leading-relaxed">
            {renderInlineFormatting(bullet[1], `bullet-${index}`)}
          </p>
        </div>
      );
      return;
    }

    paragraph.push(line);
  });

  flushParagraph();

  return <div className="space-y-2 whitespace-pre-wrap">{blocks}</div>;
}
