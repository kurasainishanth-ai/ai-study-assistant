import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/**
 * Lightweight, robust Markdown and Citation renderer for StudyVerse
 * Formats headers, lists, code, quotes, tables, and clickable citation badges [Page X] / [Slide Y]
 */
export default function MarkdownView({ content, onCitationClick }) {
  if (!content) return null;

  const processText = (text) => {
    if (typeof text !== 'string') return text;
    const parts = text.split(/(\[(?:Page|Slide)\s+\d+\])/gi);
    if (parts.length === 1) return text;

    return parts.map((part, idx) => {
      const match = part.match(/^\[(Page|Slide)\s+(\d+)\]$/i);
      if (match) {
        return (
          <span
            key={idx}
            className="citation-pill hover:border-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer inline-block"
            title={`Referenced from ${match[1]} ${match[2]}`}
            onClick={() => onCitationClick && onCitationClick({ type: match[1], num: match[2] })}
          >
            📍 {match[1]} {match[2]}
          </span>
        );
      }
      return part;
    });
  };

  const processChildren = (children) => {
    return React.Children.map(children, (child) => {
      if (typeof child === 'string') {
        return processText(child);
      }
      if (React.isValidElement(child) && child.props && child.props.children) {
        return React.cloneElement(child, {
          children: processChildren(child.props.children)
        });
      }
      return child;
    });
  };

  const components = {
    code({ node, className, children, ...props }) {
      const isBlock = /language-/.test(className || '') || 
        (node?.position?.start?.line !== node?.position?.end?.line);
      if (isBlock) {
        const lang = (className || '').replace('language-', '');
        return (
          <div className="relative group my-4">
            {lang && (
              <span className="absolute top-2 right-3 text-[10px] text-slate-500 font-mono uppercase">{lang}</span>
            )}
            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto text-sm text-cyan-300 font-mono">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          </div>
        );
      }
      return (
        <code className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      );
    },
    table({ children, ...props }) {
      return (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full divide-y divide-slate-800 border border-slate-800 rounded-lg" {...props}>
            {processChildren(children)}
          </table>
        </div>
      );
    },
    thead({ children, ...props }) {
      return <thead className="bg-slate-900/50" {...props}>{processChildren(children)}</thead>;
    },
    tbody({ children, ...props }) {
      return <tbody className="divide-y divide-slate-800 bg-transparent" {...props}>{processChildren(children)}</tbody>;
    },
    tr({ children, ...props }) {
      return <tr className="hover:bg-slate-800/30 transition-colors" {...props}>{processChildren(children)}</tr>;
    },
    th({ children, ...props }) {
      return <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider" {...props}>{processChildren(children)}</th>;
    },
    td({ children, ...props }) {
      return <td className="px-4 py-3 text-sm text-slate-300" {...props}>{processChildren(children)}</td>;
    },
    blockquote({ children, ...props }) {
      return (
        <blockquote className="border-l-4 border-purple-500 bg-purple-950/20 pl-4 py-2 my-2 rounded-r-lg text-slate-300 italic text-sm" {...props}>
          {processChildren(children)}
        </blockquote>
      );
    },
    a({ children, ...props }) {
      return <a className="text-cyan-400 hover:text-cyan-300 underline" {...props}>{processChildren(children)}</a>;
    },
    h1({ children, ...props }) {
      return <h1 className="text-2xl font-bold text-white mt-5 mb-2 pb-1 border-b border-slate-800" {...props}>{processChildren(children)}</h1>;
    },
    h2({ children, ...props }) {
      return <h2 className="text-xl font-bold text-purple-300 mt-4 mb-2" {...props}>{processChildren(children)}</h2>;
    },
    h3({ children, ...props }) {
      return <h3 className="text-lg font-semibold text-slate-200 mt-3 mb-1" {...props}>{processChildren(children)}</h3>;
    },
    p({ children, ...props }) {
      return <p className="mb-2 text-slate-300 leading-relaxed text-sm" {...props}>{processChildren(children)}</p>;
    },
    li({ children, ...props }) {
      return <li className="text-slate-300 text-sm" {...props}>{processChildren(children)}</li>;
    },
    ul({ children, ...props }) {
      return <ul className="list-disc pl-6 space-y-1 mb-3 text-slate-300" {...props}>{processChildren(children)}</ul>;
    },
    ol({ children, ...props }) {
      return <ol className="list-decimal pl-6 space-y-1 mb-3 text-slate-300" {...props}>{processChildren(children)}</ol>;
    }
  };

  let processedContent = content
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

  return (
    <div className="markdown-body select-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
