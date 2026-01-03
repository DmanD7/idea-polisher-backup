import React from 'react';

interface MarkdownRendererProps {
  content: string;
  variant?: 'emerald' | 'sky';
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, variant = 'emerald' }) => {
  const lines = content.split('\n');

  const theme = {
    emerald: {
      prose: "prose-emerald",
      h1: "text-[#1b4332]",
      h2: "text-[#2d6a4f] border-[#d8f3dc]",
      marker: "marker:text-[#52b788]",
      bold: "text-[#1b4332]"
    },
    sky: {
      prose: "prose-sky",
      h1: "text-[#0369a1]",
      h2: "text-[#0369a1] border-[#bae6fd]",
      marker: "marker:text-[#0ea5e9]",
      bold: "text-[#0369a1]"
    }
  }[variant];

  const renderInline = (text: string) => {
    // Regex to capture bold (**...**) and italics (*...*)
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className={`font-bold ${theme.bold}`}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic opacity-80">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <div className={`prose ${theme.prose} max-w-none text-slate-700`}>
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('# ')) {
          return <h1 key={index} className={`text-3xl font-bold ${theme.h1} mb-6 mt-2 tracking-tight`}>{renderInline(line.replace('# ', ''))}</h1>;
        }
        if (trimmed.startsWith('## ')) {
          return <h2 key={index} className={`text-2xl font-semibold ${theme.h2} mb-4 mt-8 border-b pb-2 tracking-tight`}>{renderInline(line.replace('## ', ''))}</h2>;
        }
        if (trimmed.startsWith('### ')) {
          return <h3 key={index} className="text-xl font-medium text-slate-800 mb-3 mt-6">{renderInline(line.replace('### ', ''))}</h3>;
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          // Check if it's a sub-bullet or main bullet
          const content = line.trim().substring(2);
          return <li key={index} className={`ml-4 list-disc mb-2 ${theme.marker}`}>{renderInline(content)}</li>;
        }
        if (trimmed === '') {
          return <div key={index} className="h-4" />;
        }
        
        return (
          <p key={index} className="mb-2 leading-relaxed">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
};