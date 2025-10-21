'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * MarkdownContent component for rendering markdown with syntax highlighting.
 *
 * Features:
 * - GitHub-flavored markdown (tables, task lists, strikethrough)
 * - Syntax highlighting for code blocks
 * - Safe HTML rendering (no XSS)
 * - Styled with Tailwind typography
 *
 * @example
 * <MarkdownContent content="# Hello\nThis is **bold** text" />
 */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn('prose prose-sm max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Customize link behavior - open external links in new tab
          a: ({ node, ...props }) => {
            const isExternal = props.href?.startsWith('http');
            return (
              <a
                {...props}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="text-blue-600 hover:text-blue-700 underline"
              />
            );
          },
          // Style code blocks
          code: ({ node, className, children, ...props }: any) => {
            const inline = !className;
            if (inline) {
              return (
                <code
                  className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className={cn(
                  'block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono',
                  className
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          // Style blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-blue-500 pl-4 italic text-gray-700 my-4"
              {...props}
            />
          ),
          // Style tables
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table
                className="min-w-full border border-gray-300 divide-y divide-gray-300"
                {...props}
              />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th
              className="px-4 py-2 bg-gray-100 text-left text-sm font-semibold text-gray-900"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td
              className="px-4 py-2 text-sm text-gray-700 border-t border-gray-300"
              {...props}
            />
          ),
          // Style lists
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside space-y-1 my-2" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol
              className="list-decimal list-inside space-y-1 my-2"
              {...props}
            />
          ),
          // Style headings
          h1: ({ node, ...props }) => (
            <h1
              className="text-2xl font-bold text-gray-900 mt-6 mb-4"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className="text-xl font-bold text-gray-900 mt-5 mb-3"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className="text-lg font-semibold text-gray-900 mt-4 mb-2"
              {...props}
            />
          ),
          // Style paragraphs
          p: ({ node, ...props }) => (
            <p className="text-gray-800 leading-relaxed my-2" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
