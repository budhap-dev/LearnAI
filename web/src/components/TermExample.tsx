import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MarkdownLink } from './MarkdownLink';

/** A glossary entry's example (Markdown: a trace, a snippet, worked numbers). */
export function TermExample({ markdown }: { markdown: string }) {
  return (
    <div className="prose term-example">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: MarkdownLink }}>{markdown}</ReactMarkdown>
    </div>
  );
}
