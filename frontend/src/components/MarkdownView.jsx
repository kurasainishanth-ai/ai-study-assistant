import React from 'react';

/**
 * Lightweight, robust Markdown and Citation renderer for StudyVerse
 * Formats headers, lists, code, quotes, tables, and clickable citation badges [Page X] / [Slide Y]
 */
export default function MarkdownView({ content, onCitationClick }) {
  if (!content) return null;

  // Render citation badges [Page X] or [Slide Y]
  const renderFormattedText = (text) => {
    // Split by citation patterns: [Page \d+] or [Slide \d+]
    const parts = text.split(/(\[(?:Page|Slide)\s+\d+\])/gi);

    return parts.map((part, idx) => {
      const citationMatch = part.match(/^\[(Page|Slide)\s+(\d+)\]$/i);
      if (citationMatch) {
        const type = citationMatch[1];
        const num = citationMatch[2];
        return (
          <span
            key={idx}
            className="citation-pill hover:border-cyan-400 hover:text-cyan-200 transition-colors"
            title={`Referenced from ${type} ${num}`}
            onClick={() => onCitationClick && onCitationClick({ type, num })}
          >
            📍 {type} {num}
          </span>
        );
      }

      // Format bold, italic, and inline code
      // Process bold **text**
      const boldParts = part.split(/(\*\*.*?\*\*)/g);
      return boldParts.map((bPart, bIdx) => {
        if (bPart.startsWith('**') && bPart.endsWith('**')) {
          return <strong key={`${idx}-${bIdx}`}>{bPart.slice(2, -2)}</strong>;
        }
        // Process inline code `code`
        const codeParts = bPart.split(/(`.*?`)/g);
        return codeParts.map((cPart, cIdx) => {
          if (cPart.startsWith('`') && cPart.endsWith('`')) {
            return <code key={`${idx}-${bIdx}-${cIdx}`}>{cPart.slice(1, -1)}</code>;
          }
          return cPart;
        });
      });
    });
  };

  const lines = content.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let listBuffer = [];
  let inOrderedList = false;

  const flushList = () => {
    if (listBuffer.length > 0) {
      if (inOrderedList) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal pl-6 space-y-1 mb-3 text-slate-300">
            {listBuffer.map((item, i) => (
              <li key={i}>{renderFormattedText(item)}</li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc pl-6 space-y-1 mb-3 text-slate-300">
            {listBuffer.map((item, i) => (
              <li key={i}>{renderFormattedText(item)}</li>
            ))}
          </ul>
        );
      }
      listBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks ```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        flushList();
        elements.push(
          <pre key={`code-${elements.length}`} className="bg-slate-950 p-4 rounded-xl border border-slate-800 my-3 overflow-x-auto text-sm text-cyan-300 font-mono">
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={`h1-${elements.length}`} className="text-2xl font-bold text-white mt-5 mb-2 pb-1 border-b border-slate-800">
          {renderFormattedText(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${elements.length}`} className="text-xl font-bold text-purple-300 mt-4 mb-2">
          {renderFormattedText(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${elements.length}`} className="text-lg font-semibold text-slate-200 mt-3 mb-1">
          {renderFormattedText(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote key={`quote-${elements.length}`} className="border-l-4 border-purple-500 bg-purple-950/20 pl-4 py-2 my-2 rounded-r-lg text-slate-300 italic text-sm">
          {renderFormattedText(line.slice(2))}
        </blockquote>
      );
    } else if (/^[-*+]\s+/.test(line)) {
      if (inOrderedList) flushList();
      inOrderedList = false;
      listBuffer.push(line.replace(/^[-*+]\s+/, ''));
    } else if (/^\d+\.\s+/.test(line)) {
      if (!inOrderedList) flushList();
      inOrderedList = true;
      listBuffer.push(line.replace(/^\d+\.\s+/, ''));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={`p-${elements.length}`} className="mb-2 text-slate-300 leading-relaxed text-sm">
          {renderFormattedText(line)}
        </p>
      );
    }
  }

  flushList();

  return <div className="markdown-body select-text">{elements}</div>;
}
