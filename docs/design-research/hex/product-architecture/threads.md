# Hex Threads - Conversational Analytics Feature

> **Launched:** October 2025 (Public Beta)
> **Source:** https://hex.tech/blog/introducing-threads/, https://hex.tech/product/threads/

## Overview

**Threads** is Hex's conversational analytics interface that allows non-technical users to ask data questions in natural language and receive trusted, analyzed answers. Unlike generic chat interfaces, Threads is deeply integrated with Hex's governed data infrastructure.

**Target Users:** Executives, product managers, business stakeholders (non-technical)

**Key Differentiator:** Data-native chat that converts conversations into reproducible Hex notebooks

---

## Core Capabilities

### 1. Natural Language Querying

- Users ask questions conversationally: "What were our top-performing products last quarter?"
- Agent understands business context and data semantics
- Multi-turn conversations allow refinement: "Now show only products above $100k revenue"

### 2. Step-by-Step Reasoning

- **Transparency:** Agent shows its thinking process, not just final results
- **Trust:** Users follow along with how the answer was derived
- **Auditability:** Clear trail from question → data access → analysis → answer

**UI Pattern:** See [AI Components - Step-by-Step Reasoning](../design-system/ai-components.md#3-step-by-step-reasoning-display)

### 3. Governed Data Access

- **Semantic Models First:** Agent prioritizes curated, governed metrics
- **Fallback to Tables:** Only accesses raw warehouse tables if needed
- **Data Team Control:** Admins decide what Threads can access

### 4. Notebook Conversion

- **Every Thread → Hex Project:** Conversations become inspectable notebooks
- **Data Team Review:** Technical users can open, debug, extend AI work
- **Reusability:** Thread outputs become context for future queries

---

## Key UX Patterns

### Homepage Prompt Bar

**Location:** Prominent search bar on Hex homepage (mobile & desktop)

**Design:**

```
┌────────────────────────────────────────────┐
│ 🔍  What would you like to analyze?        │
└────────────────────────────────────────────┘
```

- **Purpose:** Low-friction entry point, like Google search
- **Behavior:** Click → opens Threads interface
- **Visibility:** Always accessible from homepage

### @ Mention Data Sources

Users can specify which data to query:

```
"Analyze @revenue_semantic_model for Q4 trends"
"Compare @customer_table with @product_sales_table"
```

**Benefits:**

- **Context control:** Users direct agent to specific data
- **Disambiguation:** When multiple sources exist
- **Faster results:** Skip data discovery step

### Duplicate Threads

**Use Case:** Colleague shared a thread, you want to continue their analysis

**Interaction:**

1. View colleague's thread
2. Click "Duplicate Thread"
3. Continue conversation from where they left off

**Implementation:** Copies conversation history + context as new thread

### Browser Tab Readiness Indicator

**Problem:** Users don't know when agent finished processing in background tab

**Solution:** Dynamic tab title

- Thinking: `⟳ Threads | Hex`
- Complete: `✓ Threads | Hex`

---

## Under the Hood

### Technology Stack

- **LLM:** Claude Sonnet 4.5 (upgraded Oct 2025)
- **Framework:** Same agent framework as Notebook Agent
- **Tools:** SQL generation, data profiling, visualization creation, Hex docs lookup

### Agent Workflow

1. **Search:** Find relevant semantic models and tables
2. **Plan:** Determine analytical approach (cohort analysis? trend analysis?)
3. **Execute:** Write SQL, run query, generate viz
4. **Summarize:** Explain insights in business-friendly language

### Integration Points

- **Semantic Models:** Prioritized for governance
- **Explore Cells:** Create interactive visualizations users can edit
- **Notebook Agent:** Can hand off to Notebook Agent for deeper work
- **Published Apps:** Reference apps created from previous analyses

---

## Collaboration Features

### Async Communication

- Users can @ mention data team members: "Can @sophia validate this analysis?"
- Notifications sent to mentioned users
- Threaded conversations maintain context

### Mobile Optimization

- Responsive design for on-the-go queries
- Simplified UI for mobile screens
- Push notifications when agent responds

### Sharing

- Share thread URLs with team members
- Permissions inherit from underlying data sources
- Published threads can be embedded in dashboards

---

## Governance & Trust

### Data Access Control

1. **Workspace Admins** configure which data Threads can access
2. **Semantic Models** provide governed metrics and business logic
3. **Fallback Permissions** respect user's warehouse-level permissions

### Transparency

- Every analysis becomes a Hex project (full code visibility)
- Step-by-step reasoning shows data sources used
- Data teams can inspect, modify, or reject AI analyses

### Privacy

- Neither Hex nor model providers train on customer data (zero retention policy)
- BYOK (Bring Your Own Key) available for enterprise
- Metadata stored in Hex-controlled vector database

---

## Comparison to Alternatives

### vs. Slack/Discord

- **Slack:** Generic team chat, data shared as screenshots/files
- **Threads:** Data-native, answers are live, reproducible projects

### vs. Standalone "Chat with Data" Tools

- **Standalone:** Isolated from workflow, answers live in chat only
- **Threads:** Integrated with Hex workspace, answers become assets

### vs. Notebook Agent

- **Notebook Agent:** For technical users, deep-dive analysis
- **Threads:** For business users, quick questions and answers

---

## Relevance to Athena Intelligence

### Similar Capabilities Needed

1. **Document Q&A:** Natural language queries over uploaded documents
2. **Step-by-Step Reasoning:** Show AI's thinking when analyzing documents
3. **Citation/Sources:** Like Threads shows data sources, Athena shows document sources
4. **Workspace Integration:** Threads → notebooks, Athena queries → Spaces

### UX Patterns to Adopt

1. ✅ **Step-by-step reasoning display** - Builds trust in AI answers
2. ✅ **@ Mention system** - Let users specify which documents to query
3. ✅ **Homepage prompt bar** - Low-friction entry point for queries
4. ✅ **Reproducible outputs** - Save queries as inspectable objects

### Design Inspiration

- **Transparency over speed:** Show reasoning even if it takes longer
- **Governance:** Let admin/teams control what AI can access
- **Progressive disclosure:** Simple interface for basic users, notebook for power users

---

## Screenshots & Demos

### Video Resources

- **5-Minute Demo:** https://hex.tech/resources/5-min-demo/ (includes Threads)
- **YouTube:** https://www.youtube.com/watch?v=oYpizZJtvOo
- **Live Demo (Archive):** October 7, 2025 event (check Hex resources)

### Blog Posts

- **Announcement:** https://hex.tech/blog/introducing-threads/
- **Fall 2025 Launch:** https://hex.tech/blog/fall-2025-launch/

### Documentation

- **Quickstart Guide:** https://learn.hex.tech/docs/explore-data/threads

---

## Implementation Checklist for Athena

- [ ] Homepage prompt bar ("Ask Athena")
- [ ] Step-by-step reasoning UI component
- [ ] @ Mention system for specifying documents
- [ ] Query history (like Thread history)
- [ ] Convert queries to saved "Analysis" objects (like Threads → Notebooks)
- [ ] Browser tab indicator for background processing
- [ ] Workspace-level governance (which documents AI can access)
- [ ] Citation of source documents in AI responses

---

**Last Updated:** January 2025
**Key Takeaway:** Threads succeeds by being data-native, transparent, and integrated—not a standalone chatbot.
