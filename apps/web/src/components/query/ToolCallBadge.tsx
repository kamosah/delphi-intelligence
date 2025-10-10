'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, Loader2, Search, Wrench } from 'lucide-react';

interface ToolCallBadgeProps {
  tool: string;
  status: 'running' | 'complete' | 'error';
  className?: string;
}

/**
 * ToolCallBadge component for displaying tool execution status
 * Used within AI chat interfaces to show when tools are being called
 */
export function ToolCallBadge({ tool, status, className }: ToolCallBadgeProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'complete':
        return <Check className="h-3 w-3" />;
      case 'error':
        return <span className="h-3 w-3">⚠️</span>;
      default:
        return null;
    }
  };

  const getToolIcon = () => {
    // You can customize icons based on tool type
    if (tool.toLowerCase().includes('search')) {
      return <Search className="h-3 w-3" />;
    }
    return <Wrench className="h-3 w-3" />;
  };

  return (
    <Badge
      className={cn(
        'tool-execution gap-2 animate-in fade-in duration-200',
        status === 'error' &&
          'bg-destructive/10 text-destructive border-destructive/20',
        className
      )}
    >
      {getStatusIcon()}
      {getToolIcon()}
      <span className="capitalize">{tool.replace(/_/g, ' ')}</span>
    </Badge>
  );
}

/**
 * ToolCallList component for displaying multiple tool calls
 */
interface ToolCallListProps {
  tools: Array<{ name: string; status: 'running' | 'complete' | 'error' }>;
  className?: string;
}

export function ToolCallList({ tools, className }: ToolCallListProps) {
  if (tools.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tools.map((tool, index) => (
        <ToolCallBadge
          key={`${tool.name}-${index}`}
          tool={tool.name}
          status={tool.status}
        />
      ))}
    </div>
  );
}
