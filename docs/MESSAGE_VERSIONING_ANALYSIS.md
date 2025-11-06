# Message Versioning & Editing: Implementation Analysis

## Executive Summary

This document analyzes message versioning and editing implementations from Hex, Perplexity, and Claude to determine the best approach for the Olympus platform. Based on research and analysis of the current Olympus architecture, we recommend a **phased hybrid approach** starting with conversation branching similar to Claude/ChatGPT, followed by thread duplication features inspired by Hex.

---

## Research Findings

### 1. Hex Threads Approach

**Key Features:**

- **Thread Duplication**: Users can copy an entire thread that has been shared with them
- **Upstream Preservation**: Prompt history and previous results remain accessible in the original thread
- **Notebook Conversion**: Threads can be converted to notebooks for deeper analysis
- **@-mentions**: Users can reference specific data sources in conversations
- **Collaboration-focused**: Designed for team analytics workflows

**UX Pattern:**

```
Original Thread → Duplicate → New Independent Thread (with reference to original)
```

**Strengths:**

- Simple conceptual model (copy entire thread)
- Good for collaboration and sharing
- Preserves complete context in duplicates
- Aligns with team-based analytics workflows

**Limitations:**

- No in-place editing or branching within a single thread
- Creates proliferation of threads rather than versions
- Less suitable for exploring multiple analytical approaches simultaneously

---

### 2. Perplexity Approach

**Key Features:**

- **Edit Previous Prompts**: Hover over any message to reveal edit icon
- **Regenerate Results**: Modified prompts automatically regenerate responses
- **Delete Messages**: Remove follow-up questions and answers
- **Conversation Curation**: Clean up threads before sharing
- **Forward-Progress Oriented**: Focus on follow-ups rather than branching

**UX Pattern:**

```
Message → Edit → Regenerate (overwrites or creates simple version)
Message → Delete (removes from thread)
```

**Strengths:**

- Extremely simple and intuitive UX
- Low cognitive overhead for users
- Easy to implement technically
- Good for creating polished, shareable conversations
- Minimal UI clutter

**Limitations:**

- No branching or version history
- Can't explore multiple paths simultaneously
- Lost context when editing (no way to recover original)
- Limited for complex analytical exploration

**Design Philosophy:**

> "Users can edit previous prompts to regenerate results... making sharing more valuable by giving the user more control"
>
> Focus: Simplicity and control over conversation curation

---

### 3. Claude/ChatGPT Approach

**Key Features:**

- **Edit Any Message**: Click edit icon on any message in conversation
- **Conversation Branching**: Editing creates a new branch from that point forward
- **Multiple Response Variants**: Regenerate creates alternative responses
- **Navigation Arrows**: Toggle between branches (1/2, 2/2, etc.)
- **Branch Points**: Establish well-prepared context foundations for multiple query paths
- **Original Thread Preservation**: All branches preserved and navigable

**UX Pattern:**

```
Main Thread
├── Message 1
├── Message 2 (variant 1) ← → Message 2 (variant 2)
│   ├── Branch A
│   └── Branch B
└── Message 3
```

**ChatGPT Specific:**

- "Branch Conversations" feature: Split chat at any point into new independent thread
- Functions like version control (trunk + branches)
- Navigation arrows with variant indicators (1/2, 2/2)

**Claude Specific:**

- Edit in-place creates branches
- Preserves context window efficiency
- Can initiate from any previous message
- Claude Code adds checkpoint/rewind functionality

**Strengths:**

- Powerful exploration capabilities
- Preserves all conversation paths
- Excellent for complex problem-solving
- Natural for data analytics (compare different queries)
- Supports "what-if" analysis scenarios

**Limitations:**

- More complex UI/UX
- Can be overwhelming for simple use cases
- Harder to implement technically
- Navigation can become complex with many branches

**Design Philosophy:**

> "Branching transforms AI tools from simple Q&A machines into genuine thinking partners"
>
> Focus: Exploration, experimentation, and preserving all analytical paths

**Browser Extensions:**
Third-party tools like "ChatGPT Conversation Tree Graph Visualizer" and "BranchGPT" have emerged to enhance branch visualization, indicating user demand for better branch navigation.

---

## Comparative Analysis

| Feature                   | Hex                   | Perplexity       | Claude/ChatGPT         | Olympus Need               |
| ------------------------- | --------------------- | ---------------- | ---------------------- | -------------------------- |
| **Edit Messages**         | ❌ Not mentioned      | ✅ Simple edit   | ✅ Edit creates branch | ✅ High priority           |
| **Conversation Branches** | ❌ No                 | ❌ No            | ✅ Full branching      | ✅ Important for analytics |
| **Thread Duplication**    | ✅ Yes                | ❌ No            | ⚠️ ChatGPT only        | ✅ Good for collaboration  |
| **Delete Messages**       | ❌ Not mentioned      | ✅ Yes           | ❌ No                  | ⚠️ Nice to have            |
| **Version Navigation**    | N/A                   | N/A              | ✅ Arrows (1/2, 2/2)   | ✅ Critical if branching   |
| **Original Preservation** | ✅ Upstream reference | ❌ Overwrites    | ✅ All branches saved  | ✅ Essential for audit     |
| **Collaboration**         | ✅✅ Strong           | ⚠️ Share-focused | ⚠️ Limited             | ✅ Team feature            |
| **Complexity**            | Low                   | Very Low         | High                   | Medium preferred           |

---

## Recommended Approach for Olympus

### Why Conversation Branching (Claude/ChatGPT-style)?

Given Olympus is a **data analytics platform**, the branching approach is recommended because:

1. **Analytics Exploration**: Users often need to try different SQL queries or document searches
2. **Compare Approaches**: Data analysts benefit from comparing multiple query results side-by-side
3. **Audit Trail**: Enterprise users need complete history of analytical decisions
4. **"What-If" Scenarios**: Business intelligence requires exploring different analytical paths
5. **Reproducibility**: Important for data science workflows
6. **Hex Aesthetic Compatibility**: Can be styled to match Hex's clean, professional design

### Phased Implementation Strategy

#### **Phase 1: Core Conversation Branching** (Recommended MVP)

- Implement message-level editing with branch creation
- Add navigation between message variants
- Display variant indicators (1/2, 2/2)
- Preserve all branches in database

**Target Users:** Individual analysts exploring data
**Complexity:** Medium
**Time Estimate:** 8-13 story points

#### **Phase 2: Enhanced Branch Navigation** (Post-MVP)

- Add visual branch indicators
- Implement branch comparison view
- Add "Branch from here" explicit action
- Improve navigation UX with keyboard shortcuts

**Target Users:** Power users with complex analytical workflows
**Complexity:** Medium-High
**Time Estimate:** 5-8 story points

#### **Phase 3: Thread Duplication (Hex-style)** (Future)

- Add thread duplication for collaboration
- Preserve upstream reference to original
- Enable team members to continue from shared threads
- Add thread template functionality

**Target Users:** Teams collaborating on analytics
**Complexity:** Low-Medium
**Time Estimate:** 3-5 story points

#### **Phase 4: Advanced Features** (Long-term)

- Delete messages/branches
- Branch comparison visualization
- Merge branches (for advanced users)
- Export branches to separate threads

**Target Users:** Enterprise teams
**Complexity:** High
**Time Estimate:** 8-13 story points

---

## Implementation Details

### Current Olympus Architecture

**Backend Model (apps/api/app/models/query.py):**

```python
class Query(Base):
    """Current implementation treats each query as standalone entity"""
    __tablename__ = "queries"

    space_id: Mapped[UUID]
    created_by: Mapped[UUID]
    query_text: Mapped[str]  # User's question
    result: Mapped[str | None]  # AI response
    title: Mapped[str | None]
    status: Mapped[QueryStatus | None]
    # ... metadata fields
```

**Frontend Data Model (apps/web/src/lib/api/generated.ts):**

```typescript
export type QueryResult = {
  id: string;
  spaceId: string;
  createdBy: string;
  queryText: string;
  result?: string;
  title?: string;
  status?: QueryStatusEnum;
  // ... metadata fields
};
```

**Current Limitation:** No concept of conversation history, messages, or versioning.

---

### Phase 1: Backend Changes (Conversation Branching)

#### Option A: Add Message Model (Recommended)

**New Models:**

```python
# apps/api/app/models/thread.py
class Thread(Base):
    """
    Thread model representing a conversation.
    Replaces Query as the top-level entity.
    """
    __tablename__ = "threads"

    space_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("spaces.id"), nullable=False, index=True
    )
    created_by: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Auto-generate title from first message
    # e.g., "Analysis of Q4 Sales Data"

    # Relationships
    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="thread", cascade="all, delete-orphan"
    )
    space: Mapped["Space"] = relationship("Space", back_populates="threads")
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])


# apps/api/app/models/message.py
class Message(Base):
    """
    Message model for storing individual messages in a thread.
    Supports branching via parent_message_id and variant_index.
    """
    __tablename__ = "messages"

    thread_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("threads.id"), nullable=False, index=True
    )
    created_by: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )

    # Branching fields
    parent_message_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("messages.id"), nullable=True, index=True
    )
    variant_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # variant_index allows navigation: "Showing version 1 of 2" (variant_index=0, total_variants=2)

    # Message content
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # 'user' or 'assistant'
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # For assistant messages: store RAG metadata
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    sources: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    agent_steps: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Metadata
    model_used: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    processing_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relationships
    thread: Mapped["Thread"] = relationship("Thread", back_populates="messages")
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    parent: Mapped["Message"] = relationship(
        "Message", remote_side="Message.id", backref="variants"
    )
```

**Migration Strategy:**

```python
# apps/api/alembic/versions/xxx_add_message_versioning.py

def upgrade():
    # 1. Create new tables
    op.create_table('threads', ...)
    op.create_table('messages', ...)

    # 2. Migrate existing queries to new schema
    # Each Query becomes a Thread with 2 Messages (user + assistant)
    connection = op.get_bind()

    queries = connection.execute(
        "SELECT id, space_id, created_by, query_text, result, title, ... FROM queries"
    )

    for query in queries:
        # Create Thread
        thread_id = uuid.uuid4()
        connection.execute(
            "INSERT INTO threads (id, space_id, created_by, title, created_at, updated_at) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (thread_id, query.space_id, query.created_by, query.title, query.created_at, query.updated_at)
        )

        # Create user Message
        user_msg_id = uuid.uuid4()
        connection.execute(
            "INSERT INTO messages (id, thread_id, created_by, role, content, created_at, updated_at) "
            "VALUES (%s, %s, %s, 'user', %s, %s, %s)",
            (user_msg_id, thread_id, query.created_by, query.query_text, query.created_at, query.created_at)
        )

        # Create assistant Message
        if query.result:
            connection.execute(
                "INSERT INTO messages (id, thread_id, created_by, parent_message_id, role, content, "
                "confidence_score, sources, agent_steps, model_used, tokens_used, created_at, updated_at) "
                "VALUES (%s, %s, %s, %s, 'assistant', %s, %s, %s, %s, %s, %s, %s, %s)",
                (uuid.uuid4(), thread_id, query.created_by, user_msg_id, query.result,
                 query.confidence_score, query.sources, query.agent_steps, query.model_used,
                 query.tokens_used, query.completed_at or query.updated_at, query.updated_at)
            )

    # 3. Keep queries table for now (mark as deprecated)
    # Drop in future migration after confirming data integrity

def downgrade():
    # Reverse migration
    op.drop_table('messages')
    op.drop_table('threads')
```

**Database Indexes:**

```sql
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_parent_message_id ON messages(parent_message_id);
CREATE INDEX idx_messages_thread_created ON messages(thread_id, created_at);
CREATE INDEX idx_threads_space_id ON threads(space_id);
CREATE INDEX idx_threads_created_by ON threads(created_by);
```

#### Option B: Extend Query Model (Simpler, Less Flexible)

```python
# Add to existing Query model
class Query(Base):
    # ... existing fields ...

    # Versioning fields
    parent_query_id: Mapped[UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("queries.id"), nullable=True, index=True
    )
    variant_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_user_message: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationships
    parent: Mapped["Query"] = relationship("Query", remote_side="Query.id", backref="variants")
```

**Pros:** Minimal schema changes, easier migration
**Cons:** Less clean separation, harder to extend, couples query and message concepts

**Recommendation:** **Option A (Message Model)** for long-term maintainability and feature expansion.

---

### Phase 1: GraphQL Schema Changes

**apps/api/app/graphql/types.py:**

```python
import strawberry
from typing import Optional

@strawberry.type
class Message:
    """GraphQL Message type"""
    id: strawberry.ID
    thread_id: strawberry.ID
    created_by: strawberry.ID
    parent_message_id: Optional[strawberry.ID]
    variant_index: int
    role: str  # 'user' | 'assistant'
    content: str
    confidence_score: Optional[float]
    sources: Optional[strawberry.scalars.JSON]
    agent_steps: Optional[strawberry.scalars.JSON]
    model_used: Optional[str]
    tokens_used: Optional[int]
    processing_time_ms: Optional[int]
    created_at: datetime
    updated_at: datetime

    # Computed fields
    total_variants: int  # Count of sibling variants
    has_variants: bool  # Whether this message has alternatives

@strawberry.type
class Thread:
    """GraphQL Thread type"""
    id: strawberry.ID
    space_id: strawberry.ID
    created_by: strawberry.ID
    title: Optional[str]
    messages: list[Message]
    created_at: datetime
    updated_at: datetime

    # Computed fields
    message_count: int
    last_message_at: Optional[datetime]

@strawberry.input
class CreateThreadInput:
    space_id: strawberry.ID
    initial_message: str  # First user message

@strawberry.input
class AddMessageInput:
    thread_id: strawberry.ID
    parent_message_id: Optional[strawberry.ID]  # For branching
    content: str

@strawberry.input
class EditMessageInput:
    message_id: strawberry.ID
    content: str
    # Editing creates a new variant, doesn't modify original

@strawberry.input
class RegenerateMessageInput:
    message_id: strawberry.ID  # Assistant message to regenerate
```

**apps/api/app/graphql/mutations.py:**

```python
@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_thread(
        self,
        info: Info,
        input: CreateThreadInput
    ) -> Thread:
        """Create a new thread with initial message"""
        pass

    @strawberry.mutation
    async def add_message(
        self,
        info: Info,
        input: AddMessageInput
    ) -> Message:
        """Add a message to existing thread (normal flow)"""
        pass

    @strawberry.mutation
    async def edit_message(
        self,
        info: Info,
        input: EditMessageInput
    ) -> Message:
        """
        Edit a message, creating a new variant.
        Returns the new variant message.
        """
        pass

    @strawberry.mutation
    async def regenerate_message(
        self,
        info: Info,
        input: RegenerateMessageInput
    ) -> Message:
        """
        Regenerate an assistant message.
        Creates a new variant with different response.
        """
        pass
```

**apps/api/app/graphql/query.py:**

```python
@strawberry.type
class Query:
    @strawberry.field
    async def thread(self, info: Info, id: strawberry.ID) -> Optional[Thread]:
        """Get a thread by ID with all messages"""
        pass

    @strawberry.field
    async def threads(
        self,
        info: Info,
        space_id: strawberry.ID,
        limit: int = 50,
        offset: int = 0
    ) -> list[Thread]:
        """List threads in a space"""
        pass

    @strawberry.field
    async def message_variants(
        self,
        info: Info,
        parent_message_id: strawberry.ID
    ) -> list[Message]:
        """Get all variants of a message"""
        pass
```

---

### Phase 1: Frontend Changes

#### 1. Update Generated Types

After backend changes, regenerate types:

```bash
cd apps/web
npm run graphql:introspect
npm run graphql:generate
```

This will create new TypeScript types in `apps/web/src/lib/api/generated.ts`:

```typescript
export type Thread = {
  id: string;
  spaceId: string;
  createdBy: string;
  title?: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessageAt?: string;
};

export type Message = {
  id: string;
  threadId: string;
  createdBy: string;
  parentMessageId?: string;
  variantIndex: number;
  role: 'user' | 'assistant';
  content: string;
  confidenceScore?: number;
  sources?: any;
  agentSteps?: any;
  modelUsed?: string;
  tokensUsed?: number;
  processingTimeMs?: number;
  createdAt: string;
  updatedAt: string;
  totalVariants: number;
  hasVariants: boolean;
};
```

#### 2. Create React Query Hooks

**apps/web/src/hooks/queries/useThreads.ts:**

```typescript
import {
  useThreadQuery,
  useThreadsQuery,
  useCreateThreadMutation,
  useAddMessageMutation,
  useEditMessageMutation,
  useRegenerateMessageMutation,
} from '@/lib/api/hooks.generated';
import { queryKeys } from '@/lib/query/client';

// Re-export types (safe from cycles)
export type { Thread, Message } from '@/lib/api/generated';

/**
 * Fetch a single thread with all messages
 */
export function useThread(threadId: string) {
  return useThreadQuery(
    { id: threadId },
    {
      queryKey: queryKeys.threads.detail(threadId),
      enabled: !!threadId,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );
}

/**
 * Fetch threads for a space
 */
export function useThreads(spaceId: string, options = {}) {
  return useThreadsQuery(
    { spaceId, limit: 50, offset: 0 },
    {
      queryKey: queryKeys.threads.list(spaceId),
      enabled: !!spaceId,
      staleTime: 5 * 60 * 1000,
      ...options,
    }
  );
}

/**
 * Create a new thread
 */
export function useCreateThread() {
  const queryClient = useQueryClient();

  return useCreateThreadMutation({
    onSuccess: (data) => {
      // Invalidate threads list
      queryClient.invalidateQueries({
        queryKey: queryKeys.threads.list(data.thread.spaceId),
      });
    },
  });
}

/**
 * Edit a message (creates new variant)
 */
export function useEditMessage() {
  const queryClient = useQueryClient();

  return useEditMessageMutation({
    onSuccess: (data) => {
      // Invalidate thread to refetch with new variant
      queryClient.invalidateQueries({
        queryKey: queryKeys.threads.detail(data.message.threadId),
      });
    },
  });
}

/**
 * Regenerate assistant message (creates new variant)
 */
export function useRegenerateMessage() {
  const queryClient = useQueryClient();

  return useRegenerateMessageMutation({
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.threads.detail(data.message.threadId),
      });
    },
  });
}
```

#### 3. Update UI Components

**apps/web/src/components/threads/MessageWithVariants.tsx:**

```typescript
'use client';

import { useState } from 'react';
import { Button, Tooltip } from '@olympus/ui';
import { ChevronLeft, ChevronRight, Edit, RotateCw } from 'lucide-react';
import type { Message } from '@/hooks/queries/useThreads';
import { QueryMessage } from '@/components/queries/QueryMessage';

interface MessageWithVariantsProps {
  messages: Message[]; // All variants of this message
  onEdit?: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
}

/**
 * Component to display a message with variant navigation.
 *
 * Shows navigation arrows when multiple variants exist,
 * allowing users to toggle between different versions.
 */
export function MessageWithVariants({
  messages,
  onEdit,
  onRegenerate
}: MessageWithVariantsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentMessage = messages[currentIndex];
  const totalVariants = messages.length;
  const hasMultipleVariants = totalVariants > 1;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : totalVariants - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < totalVariants - 1 ? prev + 1 : 0));
  };

  return (
    <div className="relative group">
      <QueryMessage
        role={currentMessage.role}
        content={currentMessage.content}
        timestamp={currentMessage.createdAt}
        confidenceScore={currentMessage.confidenceScore}
        sources={currentMessage.sources}
      />

      {/* Variant Navigation */}
      {hasMultipleVariants && (
        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevious}
            className="h-6 w-6 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-xs">
            {currentIndex + 1} / {totalVariants}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToNext}
            className="h-6 w-6 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Action Buttons (show on hover) */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        {currentMessage.role === 'user' && onEdit && (
          <Tooltip content="Edit message">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(currentMessage.id)}
              className="h-8 w-8 p-0 bg-white shadow-sm"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </Tooltip>
        )}

        {currentMessage.role === 'assistant' && onRegenerate && (
          <Tooltip content="Regenerate response">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRegenerate(currentMessage.id)}
              className="h-8 w-8 p-0 bg-white shadow-sm"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
```

**apps/web/src/components/threads/ThreadView.tsx:**

```typescript
'use client';

import { useState } from 'react';
import { useThread, useEditMessage, useRegenerateMessage } from '@/hooks/queries/useThreads';
import { MessageWithVariants } from './MessageWithVariants';
import { ThreadInput } from './ThreadInput';
import type { Message } from '@/hooks/queries/useThreads';

interface ThreadViewProps {
  threadId: string;
}

/**
 * Main thread view component with message history and variants.
 *
 * Organizes messages into groups based on parent relationships,
 * allowing variant navigation within each message group.
 */
export function ThreadView({ threadId }: ThreadViewProps) {
  const { data: thread, isLoading } = useThread(threadId);
  const editMessage = useEditMessage();
  const regenerateMessage = useRegenerateMessage();

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  if (isLoading) return <div>Loading thread...</div>;
  if (!thread) return <div>Thread not found</div>;

  // Group messages by parent (to show variants together)
  const messageGroups = groupMessagesByParent(thread.messages);

  const handleEdit = (messageId: string) => {
    setEditingMessageId(messageId);
    // Show edit dialog/modal
  };

  const handleRegenerate = async (messageId: string) => {
    await regenerateMessage.mutateAsync({ messageId });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messageGroups.map((group) => (
          <MessageWithVariants
            key={group.id}
            messages={group.variants}
            onEdit={handleEdit}
            onRegenerate={handleRegenerate}
          />
        ))}
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <ThreadInput
          onSubmit={(content) => {
            // Add message to thread
          }}
        />
      </div>
    </div>
  );
}

// Helper function to group messages by parent
function groupMessagesByParent(messages: Message[]) {
  const groups = new Map<string, Message[]>();

  for (const message of messages) {
    const groupId = message.parentMessageId || message.id;
    if (!groups.has(groupId)) {
      groups.set(groupId, []);
    }
    groups.get(groupId)!.push(message);
  }

  return Array.from(groups.entries()).map(([id, variants]) => ({
    id,
    variants: variants.sort((a, b) => a.variantIndex - b.variantIndex),
  }));
}
```

#### 4. Update ThreadsPanel Component

**apps/web/src/components/threads/ThreadsPanel.tsx:**

Update to use new Thread type instead of QueryResult:

```typescript
import { useThreads } from '@/hooks/queries/useThreads';

// ... rest stays mostly the same, just update types
```

---

### Phase 1: Backend Service Layer

**apps/api/app/services/thread_service.py:**

```python
"""Service layer for thread and message operations."""

from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.thread import Thread
from app.models.message import Message

class ThreadService:
    """Business logic for thread operations"""

    @staticmethod
    async def create_thread(
        db: AsyncSession,
        space_id: UUID,
        created_by: UUID,
        initial_message: str
    ) -> Thread:
        """Create a new thread with initial user message"""

        # Create thread
        thread = Thread(
            space_id=space_id,
            created_by=created_by,
            title=None  # Will be generated from first message
        )
        db.add(thread)
        await db.flush()  # Get thread.id

        # Create first user message
        user_message = Message(
            thread_id=thread.id,
            created_by=created_by,
            role='user',
            content=initial_message,
            variant_index=0
        )
        db.add(user_message)
        await db.commit()
        await db.refresh(thread)

        return thread

    @staticmethod
    async def edit_message(
        db: AsyncSession,
        message_id: UUID,
        new_content: str,
        user_id: UUID
    ) -> Message:
        """
        Edit a message by creating a new variant.

        Process:
        1. Find all existing variants of this message
        2. Create new variant with incremented variant_index
        3. Invalidate any child messages (branches get cut off)
        """

        # Get original message
        result = await db.execute(
            select(Message).where(Message.id == message_id)
        )
        original = result.scalar_one()

        # Find max variant_index among siblings
        siblings_result = await db.execute(
            select(Message)
            .where(Message.parent_message_id == original.parent_message_id)
            .where(Message.thread_id == original.thread_id)
        )
        siblings = siblings_result.scalars().all()
        max_variant = max(m.variant_index for m in siblings)

        # Create new variant
        new_message = Message(
            thread_id=original.thread_id,
            created_by=user_id,
            parent_message_id=original.parent_message_id,
            variant_index=max_variant + 1,
            role=original.role,
            content=new_content
        )
        db.add(new_message)
        await db.commit()
        await db.refresh(new_message)

        return new_message

    @staticmethod
    async def regenerate_assistant_message(
        db: AsyncSession,
        message_id: UUID,
        user_id: UUID
    ) -> Message:
        """
        Regenerate an assistant message.

        Process:
        1. Get original assistant message
        2. Get parent user message
        3. Re-run RAG pipeline with same query
        4. Create new variant with new response
        """

        # Get original message
        result = await db.execute(
            select(Message)
            .where(Message.id == message_id)
            .options(selectinload(Message.parent))
        )
        original = result.scalar_one()

        if original.role != 'assistant':
            raise ValueError("Can only regenerate assistant messages")

        # Get parent user message
        parent_message = original.parent
        if not parent_message:
            raise ValueError("Assistant message has no parent")

        # Find max variant among siblings
        siblings_result = await db.execute(
            select(Message)
            .where(Message.parent_message_id == original.parent_message_id)
            .where(Message.thread_id == original.thread_id)
        )
        siblings = siblings_result.scalars().all()
        max_variant = max(m.variant_index for m in siblings)

        # Re-run RAG pipeline (import from existing query_agent)
        from app.agents.query_agent import query_agent

        # Get space context
        result = await db.execute(
            select(Thread).where(Thread.id == original.thread_id)
        )
        thread = result.scalar_one()

        # Execute agent
        response = await query_agent.execute(
            query_text=parent_message.content,
            space_id=thread.space_id,
            db=db
        )

        # Create new variant
        new_message = Message(
            thread_id=original.thread_id,
            created_by=user_id,
            parent_message_id=original.parent_message_id,
            variant_index=max_variant + 1,
            role='assistant',
            content=response.answer,
            confidence_score=response.confidence_score,
            sources=response.sources,
            agent_steps=response.agent_steps,
            model_used=response.model_used,
            tokens_used=response.tokens_used,
            processing_time_ms=response.processing_time_ms
        )
        db.add(new_message)
        await db.commit()
        await db.refresh(new_message)

        return new_message
```

---

## UX Considerations

### 1. Variant Navigation Patterns

**Option A: Inline Arrows (Recommended for MVP)**

```
┌─────────────────────────────────────┐
│ User Message                        │
│ "What were Q4 sales?"               │
│                                     │
│  ◀ 1 / 3 ▶                         │  ← Navigation arrows
└─────────────────────────────────────┘
```

**Option B: Branch Indicator**

```
┌─────────────────────────────────────┐
│ User Message               🔀 3     │  ← Branch icon + count
│ "What were Q4 sales?"               │
│                                     │
│  [v1] [v2] [v3]                    │  ← Tab-style selector
└─────────────────────────────────────┘
```

**Recommendation:** Start with Option A (simpler), add Option B in Phase 2.

### 2. Edit UX Flow

**User clicks "Edit" on a message:**

1. Show edit modal/inline editor
2. User modifies content
3. Show "Regenerate from here" button
4. Create new branch, show loading state
5. Display new variant with navigation arrows

**Alternative:** Perplexity-style hover edit icon (less discoverable but cleaner).

### 3. Hex Aesthetic Alignment

**Design Elements:**

- Clean, minimal variant navigation (not cluttered)
- Subtle hover states for edit/regenerate actions
- Gradient accents for active variants
- Professional typography (Inter font)
- Rounded corners on message cards
- Shadow on hover for interactivity

**Color Palette:**

- Primary actions: Blue gradients (`bg-gradient-to-r from-blue-500 to-blue-600`)
- Variant indicators: Muted gray (`text-gray-500`)
- Active variant: Blue accent (`border-l-4 border-blue-500`)
- Hover states: Subtle shadows (`hover:shadow-md`)

---

## Performance Considerations

### 1. Database Query Optimization

**Problem:** Loading threads with many messages and variants could be slow.

**Solution:**

```python
# Efficient query with selectinload
async def get_thread_with_messages(db: AsyncSession, thread_id: UUID) -> Thread:
    result = await db.execute(
        select(Thread)
        .where(Thread.id == thread_id)
        .options(selectinload(Thread.messages))
    )
    return result.scalar_one()
```

**Indexes:**

- `idx_messages_thread_created` for chronological ordering
- `idx_messages_parent_message_id` for variant lookups

### 2. Frontend State Management

**Problem:** Large thread history could impact render performance.

**Solutions:**

- Virtualize message list for threads with 100+ messages
- Lazy load old messages ("Load more" pagination)
- Only render active variant, fetch others on demand
- Cache variant groups in React Query

### 3. Real-time Updates

**Consider for Phase 2+:**

- WebSocket updates when collaborators edit/regenerate
- Optimistic UI updates for instant feedback
- Conflict resolution for simultaneous edits

---

## Testing Strategy

### Backend Tests

```python
# tests/test_thread_service.py

async def test_create_thread():
    """Test thread creation with initial message"""
    pass

async def test_edit_message_creates_variant():
    """Test that editing creates new variant, not overwrite"""
    pass

async def test_regenerate_creates_variant():
    """Test that regenerate creates new assistant variant"""
    pass

async def test_variant_navigation():
    """Test fetching all variants of a message"""
    pass

async def test_branch_from_middle_message():
    """Test creating branch from middle of conversation"""
    pass
```

### Frontend Tests

```typescript
// components/threads/__tests__/MessageWithVariants.test.tsx

describe('MessageWithVariants', () => {
  it('shows navigation when multiple variants exist', () => {});
  it('cycles through variants with arrow clicks', () => {});
  it('displays correct variant count', () => {});
  it('shows edit button only for user messages', () => {});
  it('shows regenerate button only for assistant messages', () => {});
});
```

### Integration Tests

```python
# tests/integration/test_thread_branching.py

async def test_end_to_end_branching():
    """
    Test complete branching flow:
    1. Create thread
    2. Add messages
    3. Edit message (creates branch)
    4. Verify both branches accessible
    5. Navigate between variants
    """
    pass
```

---

## Migration & Rollout Plan

### Phase 0: Preparation (1-2 days)

- Review this document with team
- Finalize schema design
- Create database migration
- Update GraphQL schema

### Phase 1: Backend Implementation (3-5 days)

- Implement Thread and Message models
- Write migration script
- Create service layer
- Add GraphQL resolvers
- Write backend tests

### Phase 2: Frontend Implementation (3-5 days)

- Generate TypeScript types
- Create React Query hooks
- Build MessageWithVariants component
- Update ThreadView component
- Update ThreadsPanel
- Write component tests

### Phase 3: Testing & Refinement (2-3 days)

- Integration testing
- UX testing with sample data
- Performance testing
- Bug fixes

### Phase 4: Migration & Deployment (1-2 days)

- Run data migration on staging
- Verify data integrity
- Deploy backend
- Deploy frontend
- Monitor for issues

**Total Estimate: 8-13 story points (10-17 days)**

---

## Future Enhancements (Post-Phase 1)

### Phase 2: Enhanced Navigation

- Visual branch tree indicator
- Keyboard shortcuts (← → to navigate variants)
- "Branch from here" explicit action
- Branch comparison view (side-by-side)
- Branch labels/names

### Phase 3: Thread Duplication (Hex-style)

- Duplicate entire thread
- Preserve "upstream" reference
- Thread templates
- Share threads with team

### Phase 4: Advanced Features

- Delete messages/branches
- Merge branches
- Export branch to new thread
- Thread versioning (snapshots)
- Collaborative editing indicators

---

## Open Questions

1. **Should we preserve deleted branches?**
   - Option A: Soft delete (mark as deleted, keep in DB)
   - Option B: Hard delete (remove from DB)
   - **Recommendation:** Soft delete for audit trail

2. **How many levels of branching to support?**
   - Option A: Unlimited (full tree)
   - Option B: Limit to 2-3 levels (simpler)
   - **Recommendation:** Start unlimited, monitor complexity

3. **Should we auto-generate thread titles?**
   - Option A: Use first message as title
   - Option B: Ask user to provide title
   - Option C: AI-generated summary as title
   - **Recommendation:** Option C (AI summary) for better UX

4. **How to handle variant limit?**
   - Option A: Unlimited variants
   - Option B: Limit to 5-10 variants per message
   - **Recommendation:** Start unlimited, add limits if performance issues

---

## Success Metrics

**Phase 1 Success Criteria:**

- ✅ Users can edit messages and see multiple variants
- ✅ Users can regenerate assistant responses
- ✅ Users can navigate between variants with arrows
- ✅ All existing threads migrated without data loss
- ✅ No performance degradation (<500ms thread load time)
- ✅ 90%+ test coverage on new code

**User Engagement Metrics (Post-launch):**

- % of threads with edited messages
- Average variants per message
- % of users using regenerate feature
- User satisfaction (survey feedback)
- Time spent exploring different query approaches

---

## Conclusion

Based on comprehensive research of Hex, Perplexity, and Claude's approaches, we recommend implementing **conversation branching** (Claude/ChatGPT-style) as the Phase 1 MVP for Olympus. This approach:

1. **Aligns with analytics use cases** - Supports exploring different query approaches
2. **Provides audit trail** - Preserves all analytical paths for reproducibility
3. **Scales to advanced features** - Foundation for thread duplication and collaboration
4. **Matches Hex aesthetic** - Can be styled cleanly and professionally
5. **Delivers high value** - Transforms Threads from simple Q&A to powerful exploration tool

The phased approach allows us to:

- Ship core value quickly (Phase 1: 8-13 points)
- Learn from user behavior
- Iterate based on feedback
- Add collaboration features when needed (Phase 3)

**Next Steps:**

1. Review and approve this proposal
2. Create Linear issue with Phase 1 tasks
3. Begin backend implementation
4. Iterate with design team on UX patterns

---

## Appendix: Alternative Approaches Considered

### Alternative 1: Perplexity-Only Approach

**Pros:** Simplest implementation, fastest to ship
**Cons:** Limited exploration capabilities, data loss on edit
**Verdict:** Insufficient for analytics platform needs

### Alternative 2: Hex-Only Approach (Thread Duplication)

**Pros:** Good for collaboration, aligns with Hex design
**Cons:** Doesn't support in-thread exploration, creates thread proliferation
**Verdict:** Better as Phase 3 addition to branching

### Alternative 3: Custom Olympus Hybrid

**Pros:** Tailored exactly to our needs
**Cons:** Unproven UX patterns, higher implementation risk
**Verdict:** Not recommended - stick with proven patterns

---

## References

- [Hex Threads Product Page](https://hex.tech/product/threads/)
- [Hex Fall 2025 Launch](https://hex.tech/blog/fall-2025-launch/)
- [Perplexity UX Analysis](https://mttmr.com/2024/01/10/perplexitys-high-bar-for-ux-in-the-age-of-ai/)
- [Claude Chat Productivity Techniques](https://llmindset.co.uk/posts/2024/07/chatgpt-claude-productivity-techniques/)
- [Conversation Branching Analysis](https://www.smithstephen.com/p/conversation-branching-the-ai-feature)
- [ChatGPT Branch Conversations](https://dev.to/alifar/chatgpt-branch-conversations-nonlinear-prompting-for-developers-1an9)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-04
**Author:** Claude Code (Research & Analysis)
**Status:** Draft for Review
