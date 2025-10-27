# Hex Component Mapping Guide

> **Purpose**: Map Hex UI patterns to Shadcn-ui components for consistent implementation
>
> **Last Updated**: 2025-10-25
>
> **Related Docs**: [HEX_DESIGN_SYSTEM.md](../HEX_DESIGN_SYSTEM.md), [apps/web/DESIGN_SYSTEM.md](../../apps/web/DESIGN_SYSTEM.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Component Mapping Strategy](#component-mapping-strategy)
3. [Core Components](#core-components)
4. [Threads Chat Interface](#threads-chat-interface)
5. [Database Connection UI](#database-connection-ui)
6. [SQL Notebook Cells](#sql-notebook-cells)
7. [Source Badges](#source-badges)
8. [Forms & Inputs](#forms--inputs)
9. [Layout Components](#layout-components)
10. [Implementation Examples](#implementation-examples)
11. [Customization Guide](#customization-guide)
12. [Component Checklist](#component-checklist)

---

## Overview

### Goals

This guide provides a **detailed mapping** between Hex's UI patterns (documented in `HEX_DESIGN_SYSTEM.md`) and our implementation using Shadcn-ui components from the `@olympus/ui` package.

**Key Objectives**:

1. **100% Hex aesthetic** across all features (document intelligence + database analytics)
2. **Reusable components** that can be composed into complex UIs
3. **Type-safe** implementations with proper TypeScript interfaces
4. **Accessible** components following WCAG guidelines
5. **Tested** components with Storybook stories

### Design System Architecture

```
Hex Visual Patterns (screenshots + docs)
         ↓
Component Specifications (this doc)
         ↓
Shadcn-ui Base Components (@olympus/ui)
         ↓
Customized Olympus Components (apps/web/src/components/)
         ↓
Storybook Stories (apps/web/src/stories/)
         ↓
Production UI
```

---

## Component Mapping Strategy

### Mapping Rules

1. **Start with Shadcn-ui base**: Always check if a Shadcn-ui component exists before building custom
2. **Customize styling**: Use Tailwind classes to match Hex's aesthetic
3. **Extend functionality**: Add Hex-specific behaviors (e.g., @mentions, source badges)
4. **Maintain accessibility**: Preserve Shadcn-ui's accessibility features
5. **Document in Storybook**: Create stories showing Hex-style usage

### Component Hierarchy

| Level         | Description                | Examples                              | Location                            |
| ------------- | -------------------------- | ------------------------------------- | ----------------------------------- |
| **Base**      | Shadcn-ui primitives       | Button, Card, Input                   | `packages/ui/`                      |
| **Styled**    | Hex-styled base components | HexButton, HexCard                    | `packages/ui/hex/`                  |
| **Feature**   | Domain-specific components | DatabaseConnectionCard, SourceBadge   | `apps/web/src/components/database/` |
| **Composite** | Multi-component assemblies | ThreadsChatInterface, SQLNotebookCell | `apps/web/src/components/chat/`     |

---

## Core Components

### Button Mapping

| Hex Pattern                | Shadcn-ui Component                    | Customization                |
| -------------------------- | -------------------------------------- | ---------------------------- |
| Primary button (gradient)  | `<Button variant="default">`           | Add blue gradient background |
| Secondary button (outline) | `<Button variant="outline">`           | Match Hex border color       |
| Icon button                | `<Button variant="ghost" size="icon">` | Add Hex hover state          |
| Destructive button         | `<Button variant="destructive">`       | Match Hex error red          |

**Implementation**:

```typescript
// packages/ui/hex/hex-button.tsx

import { Button, ButtonProps } from '@olympus/ui';
import { cn } from '@/lib/utils';

interface HexButtonProps extends ButtonProps {
  hexVariant?: 'primary' | 'secondary' | 'icon' | 'destructive';
}

export function HexButton({ hexVariant = 'primary', className, ...props }: HexButtonProps) {
  const hexStyles = {
    primary: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm',
    secondary: 'border-gray-300 hover:bg-gray-50 text-gray-700',
    icon: 'hover:bg-gray-100 rounded-md',
    destructive: 'bg-red-500 hover:bg-red-600 text-white',
  };

  return (
    <Button
      className={cn(hexStyles[hexVariant], className)}
      {...props}
    />
  );
}
```

### Card Mapping

| Hex Pattern       | Shadcn-ui Component | Customization                                       |
| ----------------- | ------------------- | --------------------------------------------------- |
| Connection card   | `<Card>`            | Add hover shadow, rounded corners                   |
| Chat message card | `<Card>`            | Remove border for AI messages, add blue bg for user |
| Result card       | `<Card>`            | Add subtle border, white background                 |

**Implementation**:

```typescript
// packages/ui/hex/hex-card.tsx

import { Card, CardProps } from '@olympus/ui';
import { cn } from '@/lib/utils';

interface HexCardProps extends CardProps {
  hexVariant?: 'connection' | 'message-user' | 'message-ai' | 'result';
  hoverable?: boolean;
}

export function HexCard({
  hexVariant = 'result',
  hoverable = false,
  className,
  ...props
}: HexCardProps) {
  const hexStyles = {
    connection: 'border border-gray-200 rounded-lg p-4 shadow-sm',
    'message-user': 'bg-blue-500 text-white rounded-lg p-3 ml-auto max-w-[80%]',
    'message-ai': 'border border-gray-200 rounded-lg p-3 bg-white max-w-[80%]',
    result: 'border border-gray-200 rounded-lg p-4 bg-white',
  };

  const hoverStyle = hoverable ? 'hover:shadow-md transition-shadow duration-200' : '';

  return (
    <Card
      className={cn(hexStyles[hexVariant], hoverStyle, className)}
      {...props}
    />
  );
}
```

### Input Mapping

| Hex Pattern          | Shadcn-ui Component                   | Customization                       |
| -------------------- | ------------------------------------- | ----------------------------------- |
| Text input           | `<Input>`                             | Match Hex border radius, focus ring |
| Chat input (Threads) | `<Textarea>`                          | Large rounded corners, min-height   |
| Code input (SQL)     | `<Textarea>` with syntax highlighting | Monospace font, code background     |

---

## Threads Chat Interface

### Component Breakdown

**Layout Structure** (from `HEX_DESIGN_SYSTEM.md`):

```
┌─────────────────────────────────────────────┐
│ Header: Workspace Name, Settings           │
├─────────────────────────────────────────────┤
│                                             │
│  Conversation History                       │
│  ┌──────────────────────────────────────┐  │
│  │ User Message                          │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ AI Response                           │  │
│  │ [Source Badge: SQL] [Source Badge: Doc]│  │
│  └──────────────────────────────────────┘  │
│                                             │
├─────────────────────────────────────────────┤
│ Input Field with @mentions                  │
│ [Attach] [Web Search] [Send]               │
└─────────────────────────────────────────────┘
```

### Component Mapping

| Hex Component         | Shadcn-ui Base            | Custom Component       | Location           |
| --------------------- | ------------------------- | ---------------------- | ------------------ |
| Chat container        | `<div>` with flexbox      | `ThreadsChatContainer` | `components/chat/` |
| Message bubble (user) | `<Card>`                  | `ChatMessageUser`      | `components/chat/` |
| Message bubble (AI)   | `<Card>`                  | `ChatMessageAI`        | `components/chat/` |
| Chat input            | `<Textarea>`              | `ChatInput`            | `components/chat/` |
| Mention autocomplete  | `<Popover>` + `<Command>` | `MentionAutocomplete`  | `components/chat/` |
| Send button           | `<Button>`                | `HexButton` with icon  | `packages/ui/hex/` |
| Source badge          | `<Badge>`                 | `SourceBadge`          | `components/chat/` |

### Implementation: Chat Input with @Mentions

```typescript
// apps/web/src/components/chat/ChatInput.tsx

import { useState, useRef, useCallback } from 'react';
import { Textarea } from '@olympus/ui';
import { HexButton } from '@olympus/ui/hex';
import { MentionAutocomplete } from './MentionAutocomplete';
import { Send, Paperclip } from 'lucide-react';

interface ChatInputProps {
  onSubmit: (message: string, mentions: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  onSubmit,
  placeholder = 'Ask a question...',
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Detect @ for mentions
    if (e.key === '@') {
      setShowMentions(true);
    }

    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [message, mentions]);

  const handleSubmit = useCallback(() => {
    if (message.trim()) {
      onSubmit(message, mentions);
      setMessage('');
      setMentions([]);
    }
  }, [message, mentions, onSubmit]);

  const handleMentionSelect = useCallback((mentionId: string, mentionName: string) => {
    // Replace @query with @mention pill
    const newMessage = message.replace(/@\w*$/, `@${mentionName} `);
    setMessage(newMessage);
    setMentions([...mentions, mentionId]);
    setShowMentions(false);
    textareaRef.current?.focus();
  }, [message, mentions]);

  return (
    <div className="relative border-t border-gray-200 bg-white p-4">
      <div className="relative flex items-end gap-2">
        {/* Textarea with Hex styling */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[48px] resize-none rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:ring-0"
          rows={1}
        />

        {/* Action buttons */}
        <div className="flex gap-2">
          <HexButton hexVariant="icon" size="icon" disabled={disabled}>
            <Paperclip className="h-4 w-4" />
          </HexButton>

          <HexButton
            hexVariant="primary"
            size="icon"
            onClick={handleSubmit}
            disabled={disabled || !message.trim()}
          >
            <Send className="h-4 w-4" />
          </HexButton>
        </div>
      </div>

      {/* Mention autocomplete */}
      {showMentions && (
        <MentionAutocomplete
          query={mentionQuery}
          onSelect={handleMentionSelect}
          onClose={() => setShowMentions(false)}
        />
      )}
    </div>
  );
}
```

### Implementation: Chat Message Components

```typescript
// apps/web/src/components/chat/ChatMessage.tsx

import { HexCard } from '@olympus/ui/hex';
import { SourceBadge } from './SourceBadge';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessageProps {
  message: string;
  role: 'user' | 'assistant';
  sources?: Array<{
    type: 'sql' | 'document';
    metadata: Record<string, any>;
  }>;
  timestamp: Date;
}

export function ChatMessage({ message, role, sources, timestamp }: ChatMessageProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <HexCard hexVariant="message-user">
          <p className="text-sm">{message}</p>
          <span className="text-xs text-blue-100 mt-2 block">
            {formatDistanceToNow(timestamp, { addSuffix: true })}
          </span>
        </HexCard>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4">
      <HexCard hexVariant="message-ai">
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{message}</p>

        {/* Source badges */}
        {sources && sources.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {sources.map((source, idx) => (
              <SourceBadge key={idx} type={source.type} metadata={source.metadata} />
            ))}
          </div>
        )}

        <span className="text-xs text-gray-400 mt-2 block">
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </span>
      </HexCard>
    </div>
  );
}
```

---

## Database Connection UI

### Component Breakdown

**Connection Card** (from `HEX_DESIGN_SYSTEM.md`):

```
┌─────────────────────────────────────┐
│ 🔗 Snowflake Production              │
│ snowflake://prod.us-east...          │
│ ✓ Connected   [Test] [Edit] [•••]   │
└─────────────────────────────────────┘
```

### Component Mapping

| Hex Component           | Shadcn-ui Base               | Custom Component         | Location               |
| ----------------------- | ---------------------------- | ------------------------ | ---------------------- |
| Connection card         | `<Card>`                     | `DatabaseConnectionCard` | `components/database/` |
| Connection status       | `<Badge>`                    | `ConnectionStatusBadge`  | `components/database/` |
| Connection wizard       | `<Dialog>` + multi-step form | `ConnectionWizard`       | `components/database/` |
| Connector type selector | `<Select>`                   | `ConnectorTypeSelect`    | `components/database/` |

### Implementation: Database Connection Card

```typescript
// apps/web/src/components/database/DatabaseConnectionCard.tsx

import { HexCard, HexButton } from '@olympus/ui/hex';
import { Badge } from '@olympus/ui';
import { Database, MoreVertical, TestTube, Pencil } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@olympus/ui';

interface DatabaseConnectionCardProps {
  id: string;
  name: string;
  connectorType: 'postgresql' | 'snowflake' | 'bigquery' | 'redshift';
  connectionString: string;
  status: 'connected' | 'disconnected' | 'error';
  lastTestedAt?: Date;
  onTest: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const connectorIcons = {
  postgresql: '🐘',
  snowflake: '❄️',
  bigquery: '📊',
  redshift: '🔴',
};

const statusConfig = {
  connected: {
    color: 'bg-green-100 text-green-700 border-green-200',
    label: 'Connected',
  },
  disconnected: {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    label: 'Disconnected',
  },
  error: {
    color: 'bg-red-100 text-red-700 border-red-200',
    label: 'Error',
  },
};

export function DatabaseConnectionCard({
  id,
  name,
  connectorType,
  connectionString,
  status,
  lastTestedAt,
  onTest,
  onEdit,
  onDelete,
}: DatabaseConnectionCardProps) {
  const statusStyle = statusConfig[status];

  return (
    <HexCard hexVariant="connection" hoverable className="group">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{connectorIcons[connectorType]}</span>
          <h3 className="font-semibold text-gray-900">{name}</h3>
        </div>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <HexButton hexVariant="icon" size="icon">
              <MoreVertical className="h-4 w-4" />
            </HexButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onTest(id)}>
              <TestTube className="mr-2 h-4 w-4" />
              Test Connection
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(id)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(id)} className="text-red-600">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Connection string (truncated) */}
      <p className="text-xs text-gray-500 font-mono mb-3 truncate">
        {connectionString}
      </p>

      {/* Status and actions */}
      <div className="flex items-center justify-between">
        <Badge className={statusStyle.color}>{statusStyle.label}</Badge>

        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <HexButton hexVariant="secondary" size="sm" onClick={() => onTest(id)}>
            Test
          </HexButton>
          <HexButton hexVariant="secondary" size="sm" onClick={() => onEdit(id)}>
            Edit
          </HexButton>
        </div>
      </div>

      {/* Last tested timestamp */}
      {lastTestedAt && (
        <p className="text-xs text-gray-400 mt-2">
          Last tested {formatDistanceToNow(lastTestedAt, { addSuffix: true })}
        </p>
      )}
    </HexCard>
  );
}
```

---

## SQL Notebook Cells

### Component Breakdown

**SQL Cell** (from `HEX_DESIGN_SYSTEM.md`):

```
┌─────────────────────────────────────────────┐
│ [Cell Type: SQL ▼] [▶ Run] [•••]           │
├─────────────────────────────────────────────┤
│ SELECT *                                    │
│ FROM customers                              │
│ WHERE status = 'active'                     │
├─────────────────────────────────────────────┤
│ ✓ Results (1,234 rows) [Export ▼]          │
│                                             │
│ ┌────┬────────┬────────┬─────────┐        │
│ │ ID │ Name   │ Email  │ Status  │        │
│ ├────┼────────┼────────┼─────────┤        │
│ │ 1  │ Alice  │ a@...  │ active  │        │
│ └────┴────────┴────────┴─────────┘        │
└─────────────────────────────────────────────┘
```

### Component Mapping

| Hex Component      | Shadcn-ui Base                     | Custom Component    | Location               |
| ------------------ | ---------------------------------- | ------------------- | ---------------------- |
| Cell container     | `<Card>`                           | `SQLNotebookCell`   | `components/notebook/` |
| Cell toolbar       | `<div>` with buttons               | `CellToolbar`       | `components/notebook/` |
| Code editor        | `<Textarea>` + syntax highlighting | `CodeEditor`        | `components/notebook/` |
| Results table      | `<Table>`                          | `QueryResultsTable` | `components/database/` |
| Cell type selector | `<Select>`                         | `CellTypeSelect`    | `components/notebook/` |

### Implementation: SQL Notebook Cell

```typescript
// apps/web/src/components/notebook/SQLNotebookCell.tsx

import { useState } from 'react';
import { HexCard, HexButton } from '@olympus/ui/hex';
import { CodeEditor } from './CodeEditor';
import { QueryResultsTable } from '../database/QueryResultsTable';
import { Play, MoreVertical, Download } from 'lucide-react';
import { Badge } from '@olympus/ui';

interface SQLNotebookCellProps {
  id: string;
  initialCode?: string;
  onExecute: (code: string) => Promise<QueryResult>;
  onDelete?: () => void;
}

interface QueryResult {
  status: 'success' | 'error';
  rows?: Array<Record<string, any>>;
  rowCount?: number;
  error?: string;
}

export function SQLNotebookCell({
  id,
  initialCode = '',
  onExecute,
  onDelete,
}: SQLNotebookCellProps) {
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const queryResult = await onExecute(code);
      setResult(queryResult);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <HexCard hexVariant="result" className="mb-4">
      {/* Cell toolbar */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">SQL</Badge>
          <HexButton
            hexVariant="primary"
            size="sm"
            onClick={handleRun}
            disabled={isRunning || !code.trim()}
          >
            {isRunning ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Running...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run
              </>
            )}
          </HexButton>
        </div>

        <HexButton hexVariant="icon" size="icon">
          <MoreVertical className="h-4 w-4" />
        </HexButton>
      </div>

      {/* Code editor */}
      <CodeEditor
        value={code}
        onChange={setCode}
        language="sql"
        placeholder="SELECT * FROM ..."
        minHeight="100px"
      />

      {/* Results */}
      {result && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {result.status === 'success' ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-sm text-gray-600">
                    Results ({result.rowCount?.toLocaleString()} rows)
                  </span>
                </div>
                <HexButton hexVariant="secondary" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </HexButton>
              </div>

              <QueryResultsTable rows={result.rows || []} />
            </>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{result.error}</p>
            </div>
          )}
        </div>
      )}
    </HexCard>
  );
}
```

---

## Source Badges

### Component Mapping

| Hex Pattern             | Shadcn-ui Base | Custom Component                     |
| ----------------------- | -------------- | ------------------------------------ |
| SQL result badge        | `<Badge>`      | `SourceBadge` with `type="sql"`      |
| Document citation badge | `<Badge>`      | `SourceBadge` with `type="document"` |

### Implementation: Source Badge Component

```typescript
// apps/web/src/components/chat/SourceBadge.tsx

import { Badge } from '@olympus/ui';
import { Database, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SourceBadgeProps {
  type: 'sql' | 'document';
  metadata: Record<string, any>;
  className?: string;
}

export function SourceBadge({ type, metadata, className }: SourceBadgeProps) {
  const config = {
    sql: {
      icon: <Database className="h-3 w-3" />,
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      label: `SQL Result (${metadata.rows || 0} rows)`,
    },
    document: {
      icon: <FileText className="h-3 w-3" />,
      color: 'bg-gradient-to-r from-green-500 to-teal-600',
      label: metadata.document_name || 'Document',
    },
  };

  const badgeConfig = config[type];

  return (
    <Badge
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 text-white text-xs font-semibold rounded-full',
        badgeConfig.color,
        className
      )}
    >
      {badgeConfig.icon}
      <span>{badgeConfig.label}</span>
    </Badge>
  );
}
```

### Usage in Chat Messages

```typescript
// In ChatMessage component
{sources && sources.length > 0 && (
  <div className="flex flex-wrap gap-2 mt-3">
    {sources.map((source, idx) => (
      <SourceBadge
        key={idx}
        type={source.type}
        metadata={source.metadata}
      />
    ))}
  </div>
)}
```

---

## Forms & Inputs

### Component Mapping

| Hex Component   | Shadcn-ui Base             | Custom Component           | Location           |
| --------------- | -------------------------- | -------------------------- | ------------------ |
| Text input      | `<Input>`                  | Styled with Hex focus ring | `packages/ui/hex/` |
| Select dropdown | `<Select>`                 | Hex-styled dropdown        | `packages/ui/hex/` |
| Textarea        | `<Textarea>`               | Match Hex padding/borders  | `packages/ui/hex/` |
| Form container  | `<Form>` (react-hook-form) | Standard usage             | N/A                |

### Implementation: Hex-Styled Input

```typescript
// packages/ui/hex/hex-input.tsx

import { Input, InputProps } from '@olympus/ui';
import { cn } from '@/lib/utils';

export function HexInput({ className, ...props }: InputProps) {
  return (
    <Input
      className={cn(
        'rounded-md border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
        className
      )}
      {...props}
    />
  );
}
```

### Implementation: Connection Form

```typescript
// apps/web/src/components/database/ConnectionForm.tsx

import { useForm } from 'react-hook-form';
import { HexInput, HexButton } from '@olympus/ui/hex';
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@olympus/ui';

interface ConnectionFormData {
  name: string;
  connectorType: 'postgresql' | 'snowflake' | 'bigquery' | 'redshift';
  connectionString: string;
}

interface ConnectionFormProps {
  onSubmit: (data: ConnectionFormData) => Promise<void>;
  initialData?: Partial<ConnectionFormData>;
}

export function ConnectionForm({ onSubmit, initialData }: ConnectionFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ConnectionFormData>({
    defaultValues: initialData,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Connection name */}
      <div>
        <Label htmlFor="name">Connection Name</Label>
        <HexInput
          id="name"
          {...register('name', { required: 'Name is required' })}
          placeholder="My Database"
        />
        {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
      </div>

      {/* Connector type */}
      <div>
        <Label htmlFor="connectorType">Database Type</Label>
        <Select {...register('connectorType', { required: true })}>
          <SelectTrigger>
            <SelectValue placeholder="Select database type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="postgresql">PostgreSQL</SelectItem>
            <SelectItem value="snowflake">Snowflake</SelectItem>
            <SelectItem value="bigquery">BigQuery</SelectItem>
            <SelectItem value="redshift">Redshift</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Connection string */}
      <div>
        <Label htmlFor="connectionString">Connection String</Label>
        <HexInput
          id="connectionString"
          {...register('connectionString', { required: 'Connection string is required' })}
          placeholder="postgresql://user:pass@host:5432/db"
          type="password"
        />
        {errors.connectionString && (
          <p className="text-sm text-red-600 mt-1">{errors.connectionString.message}</p>
        )}
      </div>

      {/* Submit button */}
      <div className="flex gap-2 justify-end">
        <HexButton hexVariant="secondary" type="button">
          Test Connection
        </HexButton>
        <HexButton hexVariant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Connection'}
        </HexButton>
      </div>
    </form>
  );
}
```

---

## Layout Components

### Component Mapping

| Hex Component     | Shadcn-ui Base                 | Custom Component  | Location             |
| ----------------- | ------------------------------ | ----------------- | -------------------- |
| Page container    | `<div>` with max-width         | `PageContainer`   | `components/layout/` |
| Sidebar           | `<div>` with fixed positioning | `Sidebar`         | `components/layout/` |
| Header            | `<header>`                     | `Header`          | `components/layout/` |
| Two-column layout | CSS Grid                       | `TwoColumnLayout` | `components/layout/` |

### Implementation: Threads Chat Layout

```typescript
// apps/web/src/components/layout/ThreadsChatLayout.tsx

import { ReactNode } from 'react';

interface ThreadsChatLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  header?: ReactNode;
}

export function ThreadsChatLayout({ children, sidebar, header }: ThreadsChatLayoutProps) {
  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar (optional) */}
      {sidebar && (
        <aside className="w-64 border-r border-gray-200 bg-gray-50">
          {sidebar}
        </aside>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header (optional) */}
        {header && (
          <header className="border-b border-gray-200 px-6 py-4 bg-white">
            {header}
          </header>
        )}

        {/* Chat messages (scrollable) */}
        <main className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## Implementation Examples

### Example 1: Complete Chat Interface

```typescript
// apps/web/src/app/(authenticated)/spaces/[spaceId]/chat/page.tsx

import { ThreadsChatLayout } from '@/components/layout/ThreadsChatLayout';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { useQuery, useMutation } from '@tanstack/react-query';

export default function SpaceChatPage({ params }: { params: { spaceId: string } }) {
  const { data: messages } = useQuery({
    queryKey: ['messages', params.spaceId],
    queryFn: () => fetchMessages(params.spaceId),
  });

  const sendMessage = useMutation({
    mutationFn: (message: string) => sendChatMessage(params.spaceId, message),
  });

  return (
    <ThreadsChatLayout
      header={<h1 className="text-xl font-semibold">Space Chat</h1>}
    >
      {/* Message history */}
      <div className="max-w-4xl mx-auto">
        {messages?.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg.content}
            role={msg.role}
            sources={msg.sources}
            timestamp={msg.createdAt}
          />
        ))}
      </div>

      {/* Fixed input at bottom */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            onSubmit={(message) => sendMessage.mutate(message)}
            disabled={sendMessage.isPending}
          />
        </div>
      </div>
    </ThreadsChatLayout>
  );
}
```

### Example 2: Database Connections Page

```typescript
// apps/web/src/app/(authenticated)/spaces/[spaceId]/connections/page.tsx

import { DatabaseConnectionCard } from '@/components/database/DatabaseConnectionCard';
import { ConnectionWizard } from '@/components/database/ConnectionWizard';
import { HexButton } from '@olympus/ui/hex';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export default function ConnectionsPage({ params }: { params: { spaceId: string } }) {
  const [showWizard, setShowWizard] = useState(false);

  const { data: connections } = useQuery({
    queryKey: ['connections', params.spaceId],
    queryFn: () => fetchConnections(params.spaceId),
  });

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Database Connections</h1>
        <HexButton hexVariant="primary" onClick={() => setShowWizard(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Connection
        </HexButton>
      </div>

      {/* Connection cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connections?.map((conn) => (
          <DatabaseConnectionCard
            key={conn.id}
            {...conn}
            onTest={handleTestConnection}
            onEdit={handleEditConnection}
            onDelete={handleDeleteConnection}
          />
        ))}
      </div>

      {/* Connection wizard modal */}
      {showWizard && (
        <ConnectionWizard
          open={showWizard}
          onClose={() => setShowWizard(false)}
          spaceId={params.spaceId}
        />
      )}
    </div>
  );
}
```

---

## Customization Guide

### Tailwind Configuration

**Add Hex colors to `tailwind.config.js`**:

```javascript
// apps/web/tailwind.config.js

module.exports = {
  theme: {
    extend: {
      colors: {
        hex: {
          // Primary (from screenshots - to be extracted)
          blue: {
            50: '#eff6ff',
            100: '#dbeafe',
            // ... add exact Hex blue shades
            500: '#3b82f6', // Primary blue (placeholder)
            600: '#2563eb',
          },
          // Neutrals
          gray: {
            50: '#f8f9fa',
            100: '#f1f3f5',
            200: '#e1e4e8',
            // ... Hex gray shades
          },
        },
      },
      borderRadius: {
        'hex-sm': '6px',
        'hex-md': '8px',
        'hex-lg': '12px',
      },
      boxShadow: {
        'hex-card': '0 1px 3px rgba(0,0,0,0.05)',
        'hex-card-hover': '0 4px 12px rgba(0,0,0,0.08)',
      },
    },
  },
};
```

### Shadcn-ui Theme Overrides

**Update `packages/ui/globals.css`**:

```css
/* packages/ui/globals.css */

@layer base {
  :root {
    /* Hex-inspired color tokens */
    --primary: 217 91% 60%; /* Hex blue */
    --secondary: 220 14% 96%; /* Hex gray */
    --border: 220 13% 91%; /* Hex border gray */
    --input: 220 13% 91%;
    --ring: 217 91% 60%; /* Focus ring = primary */

    /* Border radius */
    --radius: 0.5rem; /* 8px = hex-md */
  }
}
```

### Component Style Overrides

**Create Hex component variants**:

```typescript
// packages/ui/hex/index.ts

export { HexButton } from './hex-button';
export { HexCard } from './hex-card';
export { HexInput } from './hex-input';
export { HexTextarea } from './hex-textarea';
export { HexBadge } from './hex-badge';
```

---

## Component Checklist

### Phase 1: Core Components (Current Sprint)

**Base Components** (`packages/ui/hex/`):

- [ ] `HexButton` - Primary, secondary, icon, destructive variants
- [ ] `HexCard` - Connection, message, result variants
- [ ] `HexInput` - Text input with Hex styling
- [ ] `HexTextarea` - Chat input styling
- [ ] `HexBadge` - Source badges, status badges

**Chat Components** (`apps/web/src/components/chat/`):

- [ ] `ChatInput` - Textarea with @mentions
- [ ] `ChatMessage` - User/AI message bubbles
- [ ] `SourceBadge` - SQL/document source indicators
- [ ] `MentionAutocomplete` - Popover with data source suggestions
- [ ] `ThreadsChatContainer` - Main chat layout

**Database Components** (`apps/web/src/components/database/`):

- [ ] `DatabaseConnectionCard` - Connection card with actions
- [ ] `ConnectionWizard` - Multi-step connection setup
- [ ] `ConnectionForm` - Credentials input form
- [ ] `QueryResultsTable` - SQL results table
- [ ] `ConnectionStatusBadge` - Connected/disconnected/error

**Notebook Components** (`apps/web/src/components/notebook/`):

- [ ] `SQLNotebookCell` - SQL cell with editor + results
- [ ] `CodeEditor` - Syntax-highlighted code editor
- [ ] `CellToolbar` - Cell type selector, run button, actions

**Layout Components** (`apps/web/src/components/layout/`):

- [ ] `ThreadsChatLayout` - Full-page chat layout
- [ ] `TwoColumnLayout` - Sidebar + main content
- [ ] `PageContainer` - Max-width container with padding

### Phase 2: Advanced Components (Post-MVP)

- [ ] `SemanticModelBuilder` - Visual model editor
- [ ] `ChartCell` - Visualization cell
- [ ] `DataLineageGraph` - Data relationship visualization
- [ ] `QueryHistoryList` - Query history panel
- [ ] `CollaboratorAvatars` - Real-time collaboration indicators

---

## Storybook Stories

### Story Template

```typescript
// apps/web/src/stories/DatabaseConnectionCard.stories.tsx

import type { Meta, StoryObj } from '@storybook/react';
import { DatabaseConnectionCard } from '@/components/database/DatabaseConnectionCard';

const meta: Meta<typeof DatabaseConnectionCard> = {
  title: 'Database/DatabaseConnectionCard',
  component: DatabaseConnectionCard,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'radio',
      options: ['connected', 'disconnected', 'error'],
    },
    connectorType: {
      control: 'select',
      options: ['postgresql', 'snowflake', 'bigquery', 'redshift'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof DatabaseConnectionCard>;

export const PostgreSQLConnected: Story = {
  args: {
    id: '1',
    name: 'Production PostgreSQL',
    connectorType: 'postgresql',
    connectionString: 'postgresql://user@localhost:5432/olympus',
    status: 'connected',
    lastTestedAt: new Date(),
    onTest: (id) => console.log('Test:', id),
    onEdit: (id) => console.log('Edit:', id),
    onDelete: (id) => console.log('Delete:', id),
  },
};

export const SnowflakeDisconnected: Story = {
  args: {
    ...PostgreSQLConnected.args,
    name: 'Snowflake Analytics',
    connectorType: 'snowflake',
    connectionString: 'snowflake://account.region/warehouse',
    status: 'disconnected',
  },
};
```

---

## Testing Guidelines

### Component Tests

**Example: ChatInput test**:

```typescript
// apps/web/src/components/chat/__tests__/ChatInput.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '../ChatInput';

describe('ChatInput', () => {
  it('renders with placeholder', () => {
    render(<ChatInput onSubmit={jest.fn()} />);
    expect(screen.getByPlaceholderText('Ask a question...')).toBeInTheDocument();
  });

  it('calls onSubmit when Enter is pressed', () => {
    const onSubmit = jest.fn();
    render(<ChatInput onSubmit={onSubmit} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(onSubmit).toHaveBeenCalledWith('Test message', []);
  });

  it('does not submit on Shift+Enter', () => {
    const onSubmit = jest.fn();
    render(<ChatInput onSubmit={onSubmit} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

---

## Related Documentation

- [HEX_DESIGN_SYSTEM.md](../HEX_DESIGN_SYSTEM.md) - Hex visual patterns and design principles
- [apps/web/DESIGN_SYSTEM.md](../../apps/web/DESIGN_SYSTEM.md) - Olympus frontend design system
- [Component Development Guide](./component-development.md) - General component development best practices
- [DATABASE_INTEGRATION.md](../DATABASE_INTEGRATION.md) - Backend integration for database components

---

**Last Updated**: 2025-10-25
**Maintainer**: Development Team
**Status**: Component mapping guide - Phase 1 components prioritized
