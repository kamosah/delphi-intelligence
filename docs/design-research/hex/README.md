# Hex Design Research - Comprehensive Documentation

> **Research conducted:** January 2025
> **Purpose:** Inform Athena Intelligence design system, AI features, and UX patterns

## Overview

This directory contains comprehensive design research on [Hex](https://hex.tech), an AI-native data analytics platform. The research focuses on Hex's newest AI features (Threads, Notebook Agent, Semantic Model Agent) and their approach to AI-powered user experiences.

**Why Hex?** Hex is a leading example of enterprise-grade AI integration in data tools, with proven patterns for:

- Conversational analytics (Threads)
- AI-assisted code generation (Notebook Agent)
- Semantic data modeling with AI (Modeling Workbench)
- Trust, transparency, and governance in AI UX

## Table of Contents

### 🎨 Design System

- [Colors](./design-system/colors.md) - Complete color palette with hex codes
- [Typography](./design-system/typography.md) - Font families, weights, and scales
- [Components](./design-system/components.md) - UI component patterns and interactions
- [AI Components](./design-system/ai-components.md) - AI-specific UI patterns (@ mentions, diff views, step-by-step reasoning)
- [Design Tokens](./design-system/tokens.json) - JSON export for Athena integration

### 🏗️ Product Architecture

- [Threads](./product-architecture/threads.md) - Conversational analytics feature deep dive
- [Notebook Agent](./product-architecture/notebook-agent.md) - AI code assistant analysis
- [Semantic Model Agent](./product-architecture/semantic-model-agent.md) - Modeling Workbench and AI-assisted data modeling

### 🧠 Philosophy & Approach

- [AI Integration Philosophy](./philosophy/ai-integration-philosophy.md) - How Hex approaches AI UX (trust, transparency, control)
- [Prompting Best Practices](./philosophy/prompting-best-practices.md) - 20+ copy-paste prompt templates from Hex's official guide

### ♿ Accessibility

- [WCAG Patterns](./accessibility/wcag-patterns.md) - General accessibility reference patterns

### 📊 Competitive Analysis

- [AI Features Comparison](./competitive-analysis/ai-features-comparison.md) - How Hex differentiates from competitors

### 🎬 Visual Assets

- [Video Demos](./visual-assets/videos/demo-links.md) - Links to product demos and tutorials
- [Screenshots](./visual-assets/screenshots/) - Captured UI examples (via Playwright)
- [Threads UI](./visual-assets/threads/) - Thread-specific visual assets
- [Notebook Agent UI](./visual-assets/notebook-agent/) - Agent-specific visual assets
- [Semantic Model UI](./visual-assets/semantic-model-agent/) - Modeling workbench visuals

---

## Key Research Findings

### 🆕 Newest Features (High Priority for Athena)

#### 1. Threads (October 2025)

**Conversational analytics for non-technical users**

- Natural language queries over governed data
- Step-by-step reasoning display (transparent AI thinking)
- Converts to notebooks for data team review
- Mobile-optimized with homepage prompt bar
- Powered by Claude Sonnet 4.5

**Key UX Patterns:**

- Visible reasoning process (not black box)
- @-mention data sources for context control
- Duplicate threads to continue colleague's work
- Browser tab readiness indicators

**Relevance to Athena:** Similar to our document query interface and AI-powered Q&A

---

#### 2. Notebook Agent (September 2025)

**AI assistant for exploratory analysis and code generation**

- Generates Python, SQL, Markdown, Pivot, Chart cells
- Context-aware with full project knowledge
- Diff view for reviewing all changes
- Cell-level approval (Keep/Undo workflow)

**Key UX Patterns:**

- "Ask a question" modal (bottom-right corner)
- @ mention system (tables, cells, dataframes)
- Quick fix vs. Fix with agent (scoped debugging)
- Typeahead (inline autocomplete)
- 30-day conversation history

**Four Capabilities:**

1. **Search** - Discover data sources
2. **Planning** - Structure analytical approaches
3. **Execution** - Write and run code
4. **Summarization** - Explain insights in plain language

**Relevance to Athena:** Similar to our AI agent for document analysis and query generation

---

#### 3. Semantic Model Agent (August 2025)

**AI-assisted data modeling and governance**

- Modeling Workbench with autocomplete and validation
- Agent suggests architectural changes via diff view
- Cross-model calculations and joins
- Version history for collaboration

**Key UX Patterns:**

- @-mention Hex projects for context
- Diff view for reviewing model changes
- Dev branch (non-destructive) vs. main branch (production)
- Integration with dbt, Cube, Snowflake semantic layers

**Relevance to Athena:** Similar to our entity extraction and relationship mapping

---

### 🎨 Design System Highlights

**Color Palette:**

- Background: Obsidian (#14141C), Dark (#0f0f15)
- Accent: Rose-Quartz (#F5C0C0), Amethyst (#A477B2), Jade (#5CB198)
- Dark theme with vibrant accent colors

**Typography:**

- Display: PP Formula SemiExtended (700 weight, 60px max)
- Body: Cinetype, PP Formula (300-800 weights)
- Code: IBM Plex Mono, Cinetype Mono

**UI Patterns:**

- Glassmorphic cards with radial gradients
- Dot grid backgrounds (200px × 200px)
- Corner animations on hover (L-shaped indicators)
- Spring-easing transitions (747ms)
- 12-column responsive grid

---

### 🤖 AI Integration Philosophy

**Trust & Transparency:**

- ✅ Step-by-step reasoning visible to users
- ✅ Explainable outputs (Threads → notebooks)
- ✅ Diff views for all AI changes
- ✅ Cell-level approval/rejection

**Governance & Control:**

- ✅ Data teams curate AI access (semantic models)
- ✅ Workspace admins toggle features
- ✅ BYOK (Bring Your Own Key) for LLM providers
- ✅ Zero training/retention policy

**Progressive Disclosure:**

- ✅ Typeahead always available
- ✅ Agent features on paid plans
- ✅ Alpha features opt-in (purple highlighting)
- ✅ Usage limits with extension options

**Human-in-the-Loop:**

- ✅ All AI outputs require user approval
- ✅ Multi-turn refinement conversations
- ✅ Agent "checks in" when uncertain
- ✅ Business context required for best results

---

## Primary Sources

### Official Hex Resources

- **Homepage:** https://hex.tech
- **Product Pages:**
  - Notebooks: https://hex.tech/product/notebooks/
  - Magic AI: https://hex.tech/product/magic-ai/
  - Threads: https://hex.tech/product/threads/
  - Enterprise: https://hex.tech/enterprise/

### Blog Posts (Feature Announcements)

- **Threads:** https://hex.tech/blog/introducing-threads/
- **Notebook Agent:** https://hex.tech/blog/introducing-notebook-agent/
- **Prompting Guide:** https://hex.tech/blog/notebook-agent-prompting-guide-agentic-analytics/
- **Semantic Authoring:** https://hex.tech/blog/introducing-semantic-authoring/
- **Fall 2025 Launch:** https://hex.tech/blog/fall-2025-launch/

### Documentation

- **AI Overview:** https://learn.hex.tech/docs/getting-started/ai-overview
- **Notebook Agent Docs:** https://learn.hex.tech/docs/explore-data/notebook-view/notebook-agent
- **Semantic Model Sync:** https://learn.hex.tech/docs/connect-to-data/semantic-models/semantic-model-sync/intro
- **Changelog (Oct 2025):** https://learn.hex.tech/changelog/2025-10-15

### Video Resources

- **5-Minute Demo:** https://hex.tech/resources/5-min-demo/
- **YouTube Demo:** https://www.youtube.com/watch?v=oYpizZJtvOo
- **Tutorial Videos:** https://learn.hex.tech/tutorials

---

## How to Use This Research

### For Athena Design System

1. **Colors:** Adapt dark theme with vibrant accents (see `design-system/colors.md`)
2. **Typography:** Consider PP Formula alternatives (Inter, Geist)
3. **Components:** Implement glassmorphic cards, corner animations (see `design-system/components.md`)
4. **Tokens:** Import `design-system/tokens.json` into Athena's design system

### For AI Feature Development

1. **Step-by-Step Reasoning:** Implement visible AI thinking process (see `product-architecture/threads.md`)
2. **@ Mention System:** Context control for AI queries (see `design-system/ai-components.md`)
3. **Diff Views:** Review AI changes before applying (see `product-architecture/notebook-agent.md`)
4. **Prompting Templates:** Use Hex's proven prompts (see `philosophy/prompting-best-practices.md`)

### For UX Patterns

1. **Transparency:** Show AI reasoning, not just results
2. **Control:** Cell-level approval, not bulk acceptance
3. **Governance:** Data team curates what AI can access
4. **Progressive Disclosure:** Start simple, reveal advanced features gradually

---

## Success Metrics

This research provides:

- ✅ **Design tokens** ready for Athena adaptation
- ✅ **AI UX patterns** documented with examples
- ✅ **20+ prompt templates** from official Hex guide
- ✅ **Competitive positioning** insights
- ✅ **Accessibility reference** patterns
- ✅ **Visual examples** with source URLs

---

## Updates & Maintenance

- **Last Updated:** January 2025
- **Next Review:** When Hex releases major features (track via blog/changelog)
- **Contact:** Check Hex blog and changelog for latest updates

---

## Questions Answered

### Core Product

✅ What makes Hex's notebook interface more accessible than Jupyter?
→ Reactive execution, multiplayer collaboration, no-code cells, integrated deployment

✅ How does Hex balance power user features with beginner-friendly UX?
→ Progressive disclosure: Typeahead always on, advanced agents on paid plans

✅ How does Hex handle complex data visualization configuration?
→ No-code chart cells with drag-and-drop, AI-assisted chart generation

### AI & Newest Features

✅ How does Hex differentiate Threads from Slack/Discord?
→ Data-native: governed metrics, converts to notebooks, semantic model integration

✅ What makes Threads "data-native" vs generic chat?
→ Built-in tools (SQL, viz, data profiling), semantic model awareness, notebook conversion

✅ How does Hex present AI suggestions without disrupting flow?
→ Bottom-right modal, inline typeahead, diff views for review

✅ What trust indicators does Hex use for AI-generated code?
→ Step-by-step reasoning, diff views, cell-level approval, "check in" when uncertain

✅ How does Hex handle when the agent gets things wrong?
→ Keep/Undo workflow, edit inline, multi-turn refinement, 30-day history

✅ How does the agent balance automation with user control?
→ All changes require approval, @-mention for context scoping, quick fix vs full fix

✅ What visualization makes complex data models understandable?
→ Diff views, autocomplete, inline validation, dev branch preview

✅ How does Hex introduce AI features to non-technical users?
→ Threads with natural language, step-by-step reasoning, homepage prompt bar

✅ What loading states indicate "AI is thinking"?
→ Browser tab readiness indicators, step-by-step reasoning display

✅ How does Hex let users customize AI behavior?
→ Workspace rules files, @-mention scoping, BYOK, toggle features on/off

### Cross-Feature

✅ How do Threads, Notebook Agent, and core notebooks work together?
→ Threads converts to notebooks, Notebook Agent edits notebooks, shared semantic models

✅ Can you invoke Notebook Agent from within a Thread?
→ Yes, Threads uses same agent framework, can convert to notebook for deeper work

✅ Does Semantic Model Agent help with queries in Threads?
→ Yes, Threads prioritizes semantic models for accurate, governed answers

---

_This research was conducted to inform the design and development of Athena Intelligence, an AI-native operations platform._
