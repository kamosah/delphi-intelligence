# Hex AI Integration Philosophy

> **Source:** Extracted from Hex's AI features, blog posts, and product design
> **Key Principle:** Transparency, Control, and Trust over Speed

## Overview

Hex's approach to AI integration prioritizes **reviewable, durable, debuggable assets** over black-box automation. The design philosophy centers on giving users control while leveraging AI to accelerate workflows.

**Core Belief:** "Data analysis is not a verifiable task" — it requires human judgment, taste, and business context.

---

## Design Principles

### 1. Transparency Over Black Boxes

**Principle:** Show AI's reasoning process, not just final results

**Implementation:**

- **Step-by-step reasoning** (Threads): Users see how AI arrives at answers
- **Explainable outputs**: Every Thread becomes an inspectable Hex notebook
- **Visible tool use**: AI shows which data sources it queried, which methods it used

**Why It Matters:**

- Builds trust in AI recommendations
- Users learn analytical techniques from observing AI
- Enables debugging when AI makes mistakes
- Satisfies audit requirements (enterprise compliance)

**Example:**

```
❌ Bad: "Revenue increased 15% in Q4" (black box)
✅ Good:
  Step 1: Queried @revenue_semantic_model
  Step 2: Calculated year-over-year growth
  Step 3: Identified Q4 = 15% increase
  Result: "Revenue increased 15% in Q4"
```

---

### 2. Human-in-the-Loop, Always

**Principle:** AI proposes, humans dispose

**Implementation:**

- **Diff views** for all code changes - no auto-application
- **Cell-level approval**: Keep/Undo for each suggested change
- **Multi-turn refinement**: Agent "checks in" when uncertain
- **Edit inline** option: Modify AI output before accepting

**Why It Matters:**

- Prevents cascading errors from bad AI suggestions
- Maintains user agency and skill development
- Critical for high-stakes data work (finance, healthcare, legal)

**Workflow:**

```
AI Suggests → User Reviews → User Approves/Rejects → Changes Applied
```

**No shortcuts**: Even "Accept All" requires explicit user click

---

### 3. Context Control via @ Mentions

**Principle:** Users direct AI's attention, not vice versa

**Implementation:**

- `@table_name` - Specify which data to analyze
- `@cell_5` - Reference specific notebook outputs
- `@semantic_model` - Use governed metrics
- Multiple mentions: `@table1 + @table2` - Cross-reference

**Why It Matters:**

- **Performance**: Agent doesn't search entire workspace unnecessarily
- **Precision**: Eliminates ambiguity in multi-data-source environments
- **Control**: User sets boundaries on what AI can access

**Example:**

```
❌ Vague: "Analyze customer data"
  → Agent searches 50 tables, picks wrong one

✅ Precise: "Analyze @customer_transactions for Q4 trends"
  → Agent knows exactly what to query
```

---

### 4. Progressive Disclosure

**Principle:** Simple by default, powerful when needed

**Implementation:**

| Feature            | Friction Level            | User Type       |
| ------------------ | ------------------------- | --------------- |
| **Typeahead**      | Low (always on)           | All users       |
| **Threads**        | Medium (click prompt bar) | Business users  |
| **Notebook Agent** | Medium (modal, Cmd+K)     | Technical users |
| **Alpha Features** | High (opt-in toggle)      | Power users     |

**Configuration Layers:**

1. **Workspace admins** - Toggle features on/off globally
2. **Individual users** - Opt-out of specific features (e.g., typeahead)
3. **Per-interaction** - Choose when to engage agent

**Why It Matters:**

- Doesn't overwhelm beginners
- Power users access advanced capabilities
- Enterprises maintain control over AI usage

---

### 5. Governance & Data Team Control

**Principle:** Data teams curate what AI can access

**Implementation:**

**Semantic Models as Guardrails:**

- Threads prioritizes semantic models (governed metrics)
- Falls back to raw tables only if needed
- Data teams define "approved" data sources

**Workspace Configuration:**

- Admins choose which databases AI can query
- BYOK (Bring Your Own Key) for LLM providers
- Zero training/retention policy with model providers

**Audit Trail:**

- Every AI interaction logged
- Thread conversations → notebooks (full code visibility)
- Version history tracks AI-generated changes

**Why It Matters:**

- **Trust**: Business users know they're querying "approved" data
- **Quality**: Semantic models encode business logic
- **Compliance**: Full auditability for regulated industries

---

### 6. Reviewability & Durability

**Principle:** AI outputs are first-class assets, not ephemeral chat

**Implementation:**

**Threads → Notebooks:**

- Every conversation becomes a Hex project
- Data teams can open, inspect, modify, or reject
- Notebooks are versioned, shareable, reusable

**Notebook Agent → Diff Views:**

- All changes tracked with git-style diffs
- Users see exactly what changed (additions, deletions)
- Changes persist in version history

**Why It Matters:**

- AI work compounds over time (not throw-away)
- Collaboration between business users (Threads) and technical users (Notebooks)
- Enables iterative improvement of analyses

---

### 7. Safety & Error Boundaries

**Principle:** Fail gracefully, explain limitations

**Implementation:**

**When AI Is Uncertain:**

- Agent says "I'm not sure" instead of guessing
- Offers alternative approaches or asks clarifying questions
- Shows confidence indicators (when available)

**Error Handling:**

- Generated code errors → user sees error, can debug
- "Fix with agent" for complex errors (not auto-retry)
- Iteration expected, not hidden

**Workspace Rules:**

- Inject guardrails (e.g., "Never drop tables", "Always use WHERE clauses")
- PII protection rules (e.g., "Hash email addresses")

**Why It Matters:**

- Prevents catastrophic errors (data deletion, privacy leaks)
- Sets realistic expectations (AI isn't perfect)
- Maintains user trust through honesty

---

## AI Feature Comparison

### Threads (Business Users)

| Aspect             | Design Choice                             |
| ------------------ | ----------------------------------------- |
| **Transparency**   | Step-by-step reasoning visible            |
| **Control**        | @mention to specify data sources          |
| **Output**         | Reproducible notebooks (not chat history) |
| **Governance**     | Semantic models prioritized               |
| **Skill Building** | Users see SQL/analysis code               |

### Notebook Agent (Technical Users)

| Aspect             | Design Choice              |
| ------------------ | -------------------------- |
| **Transparency**   | Diff views for all changes |
| **Control**        | Cell-level Keep/Undo       |
| **Output**         | Editable code cells        |
| **Governance**     | Workspace rules files      |
| **Skill Building** | Learn from generated code  |

### Modeling Agent (Data Teams)

| Aspect             | Design Choice                        |
| ------------------ | ------------------------------------ |
| **Transparency**   | Diff views for architectural changes |
| **Control**        | Dev branch (non-destructive preview) |
| **Output**         | Versioned semantic models            |
| **Governance**     | Manual approval required             |
| **Skill Building** | Agent explains modeling decisions    |

---

## Technology Choices

### LLM Selection: Claude Sonnet 4.5

**Why Anthropic:**

- Strong performance on analytical tasks
- Constitutional AI (built-in safety)
- Zero training/retention policy
- Long context window (full project + schema)

**Upgrade Path:**

- Hex upgrades model as better versions release
- Oct 2025: Upgraded to Sonnet 4.5 across all agents

### Privacy & Security

**Zero Training Policy:**

- Neither Hex nor Anthropic train on customer data
- Prompts/responses not retained by LLM provider
- Metadata stored in Hex-controlled vector database

**BYOK (Bring Your Own Key):**

- Enterprises can use their own OpenAI/Anthropic credentials
- Direct API calls to model provider (bypasses Hex's keys)
- Enables workspace-level opt-out

### Context Management

**What AI Sees:**

- ✅ Current project cells (for Notebook Agent)
- ✅ Warehouse schema (tables, columns, relationships)
- ✅ Semantic models (governed metrics)
- ✅ Hex documentation (to answer "How do I..." questions)
- ✅ Conversation history (30-day retention)
- ❌ Other users' projects (unless explicitly shared)
- ❌ Data outside Hex platform

---

## Lessons for Athena Intelligence

### What to Adopt

1. ✅ **Step-by-Step Reasoning** - Show AI's document analysis process
2. ✅ **@ Mention System** - Let users specify which documents to query
3. ✅ **Diff Views** - If AI suggests edits to documents, show before/after
4. ✅ **Human Approval Required** - Never auto-apply AI changes
5. ✅ **Reproducible Outputs** - Save queries as inspectable objects (not just chat)
6. ✅ **Workspace Governance** - Admins control which documents AI can access
7. ✅ **Citation/Sources** - Like Threads shows data sources, Athena shows document sources
8. ✅ **Progressive Disclosure** - Simple homepage prompt, advanced features opt-in

### What to Adapt

**Threads → Athena Document Q&A:**

- Natural language queries over uploaded documents
- Step-by-step reasoning: "Searched 5 documents → Found relevant passages → Synthesized answer"
- Output: Cited answer + source documents highlighted

**Notebook Agent → Athena Document Assistant:**

- AI-suggested summaries, entity extractions, insights
- Diff view: "Agent suggests adding tags: [Legal], [Contract], [Q4]" → User reviews → Keep/Undo
- @ Mentions: "Summarize @annual_report focusing on financial performance"

**Semantic Models → Athena Knowledge Graph:**

- Agent helps build entity relationships across documents
- Diff view for suggested entities/relationships
- Manual approval before adding to graph

### What to Avoid

❌ **Black-box AI** - Always show reasoning
❌ **Auto-application** - Require explicit approval
❌ **Vague prompts** - Encourage specificity with @ mentions and templates
❌ **Isolated chat** - Make AI outputs durable, shareable assets

---

## Metrics of Success

### How Hex Measures AI Effectiveness

**Adoption:**

- % of users engaging with AI features monthly
- Frequency of Threads queries vs Notebook queries
- Retention: Users returning to AI features week-over-week

**Quality:**

- % of AI suggestions accepted (Keep vs Undo)
- Iteration count (how many back-and-forths before acceptance)
- Error rate (generated code that fails to run)

**Value:**

- Time saved (compared to manual analysis)
- Notebook creation rate (Threads → notebooks = reusable assets)
- Business user self-service (reduced load on data teams)

**Trust:**

- Agent responses inspected/modified by data teams
- % of Threads converted to production notebooks
- Repeat usage by same users (trust builds over time)

---

## Related Documentation

- [Threads](../product-architecture/threads.md) - Transparent reasoning in action
- [Notebook Agent](../product-architecture/notebook-agent.md) - Human-in-the-loop patterns
- [Prompting Best Practices](./prompting-best-practices.md) - Context control via @ mentions
- [AI Components](../design-system/ai-components.md) - UI patterns for transparency

---

**Last Updated:** January 2025

**Key Takeaway:** Hex's AI succeeds because it prioritizes transparency, user control, and durable outputs over speed and automation. Trust is earned through reviewability, not magic.
