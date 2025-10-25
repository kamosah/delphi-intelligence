# Hex Notebook Agent - AI Code Assistant

> **Launched:** September 2025
> **Source:** https://hex.tech/blog/introducing-notebook-agent/, https://learn.hex.tech/docs/explore-data/notebook-view/notebook-agent

## Overview

The **Notebook Agent** is Hex's AI assistant for exploratory data analysis and code generation. It helps technical users (data analysts, scientists, engineers) write Python, SQL, and create visualizations through natural language prompts.

**Key Philosophy:** "Reviewable, durable, debuggable assets" — not black-box automation

---

## Core Capabilities

### 1. Code Generation

**Supports:**

- SQL queries
- Python data analysis
- Markdown documentation
- Pivot tables
- Chart/visualization cells

**Example Prompts:**

- "Create a SQL query to find top 10 customers by revenue"
- "Generate a scatter plot of price vs quantity from @sales_df"
- "Write Python code to perform k-means clustering on this dataset"

### 2. Code Editing & Debugging

**Two Modes:**

| Mode               | Use Case                                  | Scope        |
| ------------------ | ----------------------------------------- | ------------ |
| **Quick Fix**      | Simple syntax errors, typos               | Single cell  |
| **Fix with Agent** | Complex bugs requiring multi-cell changes | Full project |

**Example:**

```
User: "Fix the SQL syntax error in cell 3"
Agent: [Shows diff view with corrected query]
User: [Reviews, clicks "Keep"]
```

### 3. Analysis Planning

**Multi-Step Workflows:**

1. User: "Analyze customer churn patterns"
2. Agent: "I'll approach this by:
   - Identifying churned customers
   - Analyzing behavioral patterns
   - Running cohort analysis
   - Visualizing results

   Should I proceed?"

3. User: "Yes" or "Actually, focus on pricing tier patterns instead"

### 4. Summarization & Documentation

- **Project Summaries:** "Summarize what this notebook does"
- **Cell Explanations:** "Explain this SQL query in plain English"
- **Context Generation:** "Generate a portable context prompt for new notebook"

---

## Key UX Patterns

### "Ask a Question" Modal

**Location:** Bottom-right corner of notebook interface

**Design:** See [AI Components - Ask Modal](../design-system/ai-components.md#5-ask-a-question-modal)

**Invocation:**

- Click floating "Ask AI" button
- Keyboard shortcut: `Cmd/Ctrl + K`
- Click "Ask agent" in cell context menu

### @ Mention System

**Context Scoping:** Tell agent exactly what to consider

**Supported References:**

- `@table_name` - Database tables
- `@cell_5` - Output from specific cells
- `@df_customers` - Dataframe variables
- `@semantic_model` - Semantic models (for governed metrics)

**Example:**

```
"Analyze @customer_transactions table, focusing on @cell_3
 output to identify repeat purchase patterns"
```

**Benefits:**

- **Precision:** No ambiguity about data sources
- **Performance:** Agent doesn't search entire workspace
- **Control:** User directs agent's attention

### Diff View for Changes

**Every** AI-suggested change shows in diff view before applying

**Flow:**

1. Agent proposes changes
2. User sees "Pending Changes" modal
3. Reviews cell-by-cell with additions (jade) and deletions (red)
4. Options per cell: **Keep**, **Undo**, **Edit Inline**
5. Final approval: **Accept All** or **Reject All**

**Design:** See [AI Components - Diff View](../design-system/ai-components.md#2-diff-view-component)

**Keyboard Shortcuts:**

- `Cmd/Ctrl + Enter` - Accept current cell
- `Cmd/Ctrl + Backspace` - Reject current cell
- `Tab` - Next cell, `Shift + Tab` - Previous cell

### Typeahead (Inline Autocomplete)

**Real-time code suggestions as you type**

**Example:**

```sql
SELECT customer_id,
       name,
       email, created_at        ← User typed
       , lifetime_value         ← Gray ghost text (AI suggestion)
FROM customers
```

**Interaction:**

- `Tab` or `→` - Accept suggestion
- Continue typing - Dismiss

**Configuration:**

- Workspace-level toggle (admins can disable)
- Individual user preferences (opt-out available)

---

## Agent Architecture

### Four Core Functions

1. **Search** - "Help me discover data related to [topic]"
   - Searches warehouse schema
   - Lists semantic models
   - Suggests relevant tables

2. **Planning** - "What's the best approach to analyze [question]?"
   - Suggests analytical techniques
   - Explains trade-offs
   - Outlines multi-step approach

3. **Execution** - "Create cells using SQL and Python for [analysis]"
   - Generates working code
   - Chains cells together
   - Creates visualizations

4. **Summarization** - "Explain what this project does"
   - Generates markdown explanations
   - Adds inline comments
   - Creates project summaries

### Context Awareness

Agent has full access to:

- ✅ All cells in current project
- ✅ Warehouse schema (tables, columns, relationships)
- ✅ Semantic models
- ✅ Hex documentation (to answer "How do I..." questions)
- ✅ Previous conversation history (30-day retention)
- ✅ Workspace rules files (organizational standards)

❌ Does NOT access:

- Other projects (unless explicitly @mentioned)
- User's private data outside Hex
- Other workspaces

---

## Advanced Features

### Meta-Prompting

**Technique:** Build a plan first, then feed it back to agent

**Workflow:**

1. User: "Create a plan for analyzing customer lifetime value"
2. Agent: [Generates detailed plan]
3. User: Copies plan, pastes back: "Execute this plan: [paste]"
4. Agent: [Follows plan step-by-step]

**Benefit:** Reduces confusion on complex, multi-step analyses

### Workspace Rules Files

**Purpose:** Inject organizational context into every agent interaction

**Example Rules File:**

```markdown
# Company Standards

- All currency is in USD
- Fiscal year starts in July
- Customer churn = no activity in 90 days
- Use semantic_models.revenue for all revenue calculations
- PII data requires masking (use hash_email function)
```

**Impact:** Agent follows company standards automatically

### Cross-Project Context

**Use Case:** Start new notebook based on previous work

**Workflow:**

1. In old notebook: "Generate a portable context prompt"
2. Agent: "This notebook analyzes Q3 revenue using @revenue_model, filtering for enterprise customers, calculating metrics: ARR, churn rate, NPS"
3. Copy prompt to new notebook
4. New agent has context without rewriting

---

## Limitations & Error Handling

### What Agent Can't Do

- **Verifiable correctness:** "Data analysis is not a verifiable task" — requires human judgment
- **Perfect code on first try:** Complex analyses may need iteration
- **Access to real-time data:** Works with warehouse data only
- **Execute code:** Agent generates code, user runs it

### Error States

1. **"I'm not sure how to approach this"**
   - Agent suggests alternative phrasings
   - Offers to break down into smaller steps

2. **"This requires business context I don't have"**
   - Agent asks clarifying questions
   - Prompts user to add context to prompt

3. **Generated code has errors**
   - User sees error in cell
   - Uses "Fix with agent" to debug
   - Iterates until working

---

## Technology

- **Model:** Claude Sonnet 4.5 (upgraded Oct 2025)
- **Context Window:** Full project + schema + conversation history
- **Latency:** 5-30 seconds for typical queries
- **Rate Limits:** Monthly usage limits per plan tier

---

## Relevance to Athena Intelligence

### Similar Capabilities for Athena

| Hex Feature            | Athena Equivalent                             |
| ---------------------- | --------------------------------------------- |
| Code generation        | AI-generated document queries                 |
| @ Mention tables       | @ Mention documents/sections                  |
| Diff view for changes  | Review AI-suggested summaries before saving   |
| Step-by-step reasoning | Show AI's analysis process for documents      |
| Context awareness      | AI knows uploaded documents, user preferences |

### UX Patterns to Adopt

1. ✅ **@ Mention system** - Critical for multi-document workspaces
2. ✅ **Diff view** - If AI suggests edits to documents
3. ✅ **Modal entry point** - "Ask Athena" button
4. ✅ **Quick actions** - Pre-defined prompts (Summarize, Extract Entities, etc.)

### Design Principles

1. **Human-in-the-loop:** Never auto-apply AI changes
2. **Transparency:** Show what AI is doing, not just results
3. **Reviewability:** All AI outputs are inspectable and editable
4. **Context control:** User specifies what AI should consider

---

## Screenshots & Demos

- **Announcement Blog:** https://hex.tech/blog/introducing-notebook-agent/
- **Documentation:** https://learn.hex.tech/docs/explore-data/notebook-view/notebook-agent
- **Prompting Guide:** https://hex.tech/blog/notebook-agent-prompting-guide-agentic-analytics/

---

## Implementation Checklist for Athena

- [ ] "Ask Athena" modal (bottom-right or top prompt bar)
- [ ] @ Mention system for documents
- [ ] Diff view for AI-suggested edits
- [ ] Quick action buttons (Summarize, Extract, Analyze)
- [ ] Conversation history (30-day retention)
- [ ] Workspace rules files for organizational context
- [ ] Typeahead (optional, for query builder)
- [ ] Keyboard shortcuts (Cmd+K to open, Cmd+Enter to send)

---

**Last Updated:** January 2025
**Key Takeaway:** Notebook Agent succeeds by giving users control, transparency, and reviewable outputs—not black-box automation.
