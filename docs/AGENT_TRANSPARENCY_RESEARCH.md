# Agent Transparency Research

**Related Issue**: [LOG-192](https://linear.app/logarithmic/issue/LOG-192) - Implement Agent Transparency UI with Progressive Disclosure in Threads

**Research Date**: January 2025

**Status**: ✅ Research Complete → Implementation Planning

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Platform Analysis](#platform-analysis)
3. [Common Patterns Across Platforms](#common-patterns-across-platforms)
4. [Best Practices (Research-Backed)](#best-practices-research-backed)
5. [Design Principles for Olympus](#design-principles-for-olympus)
6. [Technical Considerations](#technical-considerations)
7. [Success Metrics](#success-metrics)
8. [References & Further Reading](#references--further-reading)

---

## Executive Summary

This document synthesizes research on agent transparency UI patterns from leading AI platforms to inform the implementation of transparent, trustworthy AI interactions in Olympus Threads. The research analyzed 7 major platforms and identified 10 common transparency patterns that balance simplicity with detailed information access.

### Key Findings

1. **Progressive Disclosure is Universal**: All leading platforms use 3-level information hierarchies (Summary → Detailed → Technical) to balance ease-of-use with transparency
2. **Real-time Visibility Builds Trust**: Showing agent steps in real-time (not just final results) significantly increases user confidence
3. **Citation Systems are Critical**: Inline references with hover previews and expandable source details are table stakes for AI-powered research tools
4. **User Control is Essential**: Allow users to customize transparency levels based on expertise (power users vs. casual users)
5. **Error Transparency Matters**: Clear error states with recovery guidance reduce abandonment and build long-term trust

### Recommended Implementation Approach

Implement agent transparency in **6 phased releases**:

1. **Phase 1**: Agent Step Visualization (Core Transparency)
2. **Phase 2**: Progressive Disclosure UI (Expandable Details)
3. **Phase 3**: Enhanced Citation UI (Inline & Interactive)
4. **Phase 4**: Confidence Breakdown & Uncertainty Display
5. **Phase 5**: User Preferences & Settings
6. **Phase 6**: Error Transparency & Recovery

**Total Estimated Effort**: 20 points (~26-40 hours)

---

## Platform Analysis

### 1. Hex Threads (Primary Inspiration)

**Platform Type**: Data analytics and notebook platform with AI-powered Threads

**Key Transparency Features**:

- **Layered Complexity**: Default view shows natural language summaries and visualizations; extended inspection allows users to "click into" Explore cells to edit and work with them more deeply
- **Bifurcated Transparency**: Technical audiences get queryable SQL artifacts; business users see polished visualizations and explanations
- **Notebook Conversion**: Threads can be converted into notebooks for deeper analysis and audit trails
- **Asynchronous Processing**: Users can "walk away to grab a coffee" while analysis runs, with clear background processing status indicators
- **Full Auditability**: Every Thread is backed by a Hex project that data teams can open and inspect

**Why This Matters for Olympus**:

Hex's approach perfectly balances simplicity for business users with depth for technical users. Their "progressive disclosure" pattern (start simple, dig deeper on demand) is ideal for Olympus's hybrid document + database intelligence platform. We should adopt:

- **Default simplicity**: Show clean AI responses with minimal clutter
- **Optional depth**: Allow users to expand agent steps, citation details, and confidence breakdowns
- **Auditability**: Store full agent execution traces for debugging and compliance

**Visual Examples**:

- Natural language summaries with visualizations (collapsed by default)
- SQL queries accessible via "View SQL" button (technical users)
- Background processing indicators ("Analyzing 5 datasets...")
- Notebook conversion for deep inspection

**References**:

- [Hex Threads Documentation](https://hex.tech/product/threads/)
- [Hex Design Philosophy](https://hex.tech/blog/threads-launch/)

---

### 2. Perplexity

**Platform Type**: AI-powered search engine with source attribution

**Key Transparency Features**:

- **Inline Citations**: Numbered footnotes (e.g., [1], [2], [3]) embedded directly in AI responses
- **Source Cards**: Expandable cards with rich metadata (title, favicon, publication date, credibility badges)
- **Interactive Access**:
  - Hover: Quick preview popover with snippet and source details
  - Click: Open full source in new tab or expand full citation
- **Visual Hierarchy**: Titles, site names, and favicons help users quickly judge relevance and credibility
- **Citation Clustering**: Groups related sources together to reduce cognitive load

**Why This Matters for Olympus**:

Perplexity's citation system is the gold standard for AI-powered research tools. Their inline + expandable approach makes sources accessible without overwhelming users. We should adopt:

- **Inline markers**: `[1]`, `[2]` in AI responses (clickable badges)
- **Hover previews**: Quick snippet + metadata on hover (no click required)
- **Expandable details**: Full citation cards with similarity scores, document metadata, and chunk text
- **Visual credibility indicators**: Favicon/icon, document type badges, confidence scores

**Visual Examples**:

- Inline citation badges: `[1]` in blue, hoverable
- Preview popover: Document title, 2-3 sentence snippet, similarity score
- Full citation card: Title, document name, page number, full chunk text, "View document" link

**References**:

- [Perplexity Citation System](https://www.perplexity.ai/)
- [Perplexity Blog: Building Trust Through Citations](https://blog.perplexity.ai/)

---

### 3. Claude (Anthropic)

**Platform Type**: AI assistant with extended reasoning capabilities

**Key Transparency Features**:

- **Extended Thinking**: Step-by-step reasoning display for complex tasks
- **Think Tool**: Enhanced reasoning mode for long chains of tool calls
- **Transparency Modes**: Varying levels from summary to detailed reasoning traces
- **User Control**: Users can view or hide thinking process as needed (collapsible sections)
- **Real-time Streaming**: Thinking process streams in real-time, showing agent's "inner monologue"

**Why This Matters for Olympus**:

Claude's "Extended Thinking" feature demonstrates that showing agent reasoning in real-time builds trust without overwhelming users. Their collapsible sections allow power users to dig deep while keeping UI clean for casual users. We should adopt:

- **Real-time step streaming**: Show agent workflow steps (retrieve → generate → cite) as they happen
- **Collapsible reasoning**: Hide details by default, expand on demand
- **"Inner monologue" transparency**: Show what the agent is "thinking" during each step (optional, advanced mode)

**Visual Examples**:

- Collapsible "Thinking..." section with step-by-step reasoning
- Real-time streaming updates (e.g., "Searching documents...", "Analyzing context...", "Generating response...")
- Toggle to show/hide thinking process

**References**:

- [Claude Extended Thinking Documentation](https://www.anthropic.com/news/extended-thinking)
- [Anthropic Blog: Transparency by Design](https://www.anthropic.com/research)

---

### 4. ChatGPT (OpenAI)

**Platform Type**: General-purpose AI assistant with plugin ecosystem

**Key Transparency Features**:

- **Code Interpreter**: Real-time Python code execution display with file upload/download
- **Web Browsing**: Shows websites visited and cites sources during research
- **Interactive Charts**: Hoverable, customizable visualizations generated by Code Interpreter
- **Plugin Visibility**: Clearly shows which plugins are being used (e.g., "Using Wolfram Alpha...")
- **Step Annotations**: Each plugin/tool invocation labeled with clear "Using [Tool]" indicators

**Why This Matters for Olympus**:

ChatGPT's plugin transparency is excellent for multi-tool workflows. Their "Using [Tool]" labels make it immediately clear what the agent is doing. We should adopt:

- **Tool/Step Labels**: Show which agent node is active (e.g., "Retrieving Context...", "Generating Response...")
- **Interactive Results**: Allow users to interact with agent outputs (e.g., click to view full document chunk)
- **Clear Delineation**: Visually separate agent actions from final results

**Visual Examples**:

- "Using Code Interpreter" badge with spinner
- Real-time code execution output
- "Browsing [website]" indicator with URL
- Interactive charts with hover tooltips

**References**:

- [ChatGPT Plugins Documentation](https://platform.openai.com/docs/plugins)
- [Code Interpreter Announcement](https://openai.com/blog/chatgpt-plugins)

---

### 5. Cursor AI

**Platform Type**: AI-powered code editor

**Key Transparency Features**:

- **Diff Views**: Aggregated diff review for agent-produced changes (before/after comparison)
- **Multi-Agent Display**: Shows up to 8 parallel agents working with isolation via git worktrees
- **Approval Workflow**: "Ask Mode" suggests changes but waits for approval before implementing
- **File-Level Transparency**: Shows which files the agent is reading, editing, or creating
- **Undo/Redo Stack**: Full history of agent actions with ability to revert

**Why This Matters for Olympus**:

Cursor's approval workflow and diff views are critical for high-stakes use cases (e.g., database queries, document edits). Their "suggest first, execute after approval" pattern builds trust. We should adopt (future phases):

- **Preview Mode**: Show query results or document edits before committing
- **Approval Workflow**: For destructive actions (e.g., database writes), require user confirmation
- **Action History**: Store full log of agent actions with undo capability

**Visual Examples**:

- Side-by-side diff view (before/after)
- "Approve" / "Reject" buttons for suggested changes
- Multi-agent dashboard showing parallel work streams
- File change indicators (added, modified, deleted)

**References**:

- [Cursor Documentation](https://cursor.sh/)
- [Cursor Blog: AI-Powered Code Review](https://cursor.sh/blog)

---

### 6. V0 by Vercel

**Platform Type**: AI-powered UI generation tool

**Key Transparency Features**:

- **Step-by-Step Planning**: Agent plans out work with visible steps before execution
- **Streaming React Components**: Real-time UI updates as agent processes (live preview)
- **Generative UI**: LLMs get rich, component-based interfaces (not just text)
- **Version History**: Multiple generated variants with ability to switch between them
- **Interactive Previews**: Live, interactive component previews during generation

**Why This Matters for Olympus**:

V0's "plan then execute" pattern and live previews are excellent for workflows where users need to verify outputs before committing. We should adopt (future phases):

- **Planning Phase**: Show agent's execution plan before starting (e.g., "I will: 1. Search documents, 2. Analyze context, 3. Generate response")
- **Live Previews**: For data visualizations or SQL query results, show preview during generation

**Visual Examples**:

- Step-by-step plan with checkboxes
- Live component preview with real-time updates
- Version carousel (swipe between variants)

**References**:

- [V0 by Vercel](https://v0.dev/)
- [Vercel Blog: Generative UI](https://vercel.com/blog/ai-sdk-3-generative-ui)

---

### 7. Replit Agent

**Platform Type**: AI-powered coding environment with full-stack app generation

**Key Transparency Features**:

- **Live Activity Feed**: Chronological history with clickable file links (e.g., "Edited app.py", "Installed numpy")
- **Progress Tab**: Track agent actions throughout workflow (persistent sidebar)
- **Checkpoints**: Major milestone markers showing completed work (e.g., "✓ Database connected", "✓ API routes created")
- **Detailed Tool Messages**: Clear updates for package installs, shell commands, file operations
- **Real-time Preview**: Industry-first realtime app design preview (as agent codes, UI updates)
- **Error Surfacing**: Immediate error display with inline suggestions for fixes

**Why This Matters for Olympus**:

Replit's activity feed and checkpoint system are perfect for long-running agent workflows (e.g., multi-document analysis, complex SQL queries). Their persistent progress tracking reduces user anxiety during async operations. We should adopt:

- **Activity Feed**: Persistent log of agent actions (collapsible, but always accessible)
- **Checkpoints**: Mark major workflow milestones (e.g., "✓ Retrieved 5 documents", "✓ Generated response")
- **Clickable History**: Allow users to click on past actions to view details (e.g., click "Retrieved 5 documents" to see document list)

**Visual Examples**:

- Sidebar activity feed with icons (file edit, package install, shell command)
- Checkpoint badges with green checkmarks
- Clickable action items that expand to show details
- Real-time preview window synced with agent actions

**References**:

- [Replit Agent Documentation](https://replit.com/agent)
- [Replit Blog: Agent Launch](https://blog.replit.com/agent)

---

## Common Patterns Across Platforms

After analyzing 7 leading AI platforms, we identified **10 universal transparency patterns** that should inform Olympus's agent UI design:

### 1. Progressive Disclosure

**Pattern**: Start with essential information, reveal details on demand

**Implementation**:

- **Level 1 (Summary)**: Clean AI response with inline citations and confidence score
- **Level 2 (Detailed)**: Expandable sections for agent steps, citation details, confidence breakdown
- **Level 3 (Technical)**: Full agent execution trace, token counts, API parameters (advanced mode)

**Olympus Application**:

- Default: Show AI response + inline citations (collapsed details)
- On click: Expand agent step indicator, citation cards, confidence breakdown
- Advanced toggle: Show full agent logs, LangGraph workflow trace, LangSmith links

**Best Practices**:

- Use consistent expand/collapse controls (chevron icons, "View details" links)
- Remember user preferences (if user always expands citations, default to expanded)
- Limit nesting to 3-4 levels max (avoid "accordion hell")

---

### 2. Three-Level Hierarchy

**Pattern**: Organize information in 3 distinct layers (Summary → Detailed → Technical)

**Implementation**:

- **Summary**: High-level overview for all users (e.g., "AI analyzed 5 documents and generated a response with 85% confidence")
- **Detailed**: Expanded information for curious users (e.g., list of documents, similarity scores, reasoning steps)
- **Technical**: Expert-level details for power users (e.g., embedding vectors, LangGraph state, token counts)

**Olympus Application**:

- **Summary**: AI response + inline citations + confidence score
- **Detailed**: Agent step indicator (retrieve → generate → cite) + citation cards with snippets + confidence breakdown
- **Technical**: Full agent logs, LangGraph trace, LangSmith debugging links, token usage, API parameters

**Best Practices**:

- Clearly delineate between levels (visual separators, color coding)
- Make level transitions smooth (animations, loading states)
- Allow users to jump directly to any level (don't force sequential navigation)

---

### 3. Visual Indicators

**Pattern**: Use icons, badges, colors to denote agent actions vs. final results

**Implementation**:

- **Agent Actions**: Purple/blue color scheme, spinner icons, "in progress" badges
- **Final Results**: Green checkmarks, success badges, clean text formatting
- **Errors**: Red X icons, error badges, warning triangles
- **Citations**: Numbered badges ([1], [2]), document icons, source type indicators

**Olympus Application** (following Hex aesthetic):

- Agent steps: Purple gradient backgrounds, spinner icons
- Completed steps: Green checkmarks, "✓ Done" badges
- Active step: Purple highlight, spinner animation
- Citations: Blue numbered badges ([1]), document icons (📄), similarity score bars
- Errors: Red backgrounds, error icons (⚠️), retry buttons

**Best Practices**:

- Use consistent icon set (e.g., Lucide icons from Shadcn)
- Ensure color accessibility (sufficient contrast ratios)
- Combine color with icons/text (don't rely on color alone)

---

### 4. Expandable Sections

**Pattern**: Accordions, collapsible panels for complex reasoning and context

**Implementation**:

- Use Shadcn `Collapsible` or `Accordion` components from `@olympus/ui`
- Default state: collapsed (keep UI clean)
- Interaction: Click header to expand/collapse
- Animation: Smooth height transition (200ms)

**Olympus Application**:

- Agent step details: Accordion with 3 sections (Retrieve, Generate, Cite)
- Citation cards: Collapsible cards showing snippet → full chunk text
- Confidence breakdown: Expandable section showing overall score → per-citation scores → context quality
- Error details: Collapsible error message with stack trace and recovery actions

**Best Practices**:

- Show clear "expand/collapse" affordances (chevron icons, "+/-" indicators)
- Animate transitions (height, opacity) for polish
- Maintain scroll position after expand/collapse
- Add "Expand all" / "Collapse all" controls for power users

---

### 5. Real-time Status

**Pattern**: Streaming updates, progress indicators showing agent activity as it happens

**Implementation**:

- SSE (Server-Sent Events) for real-time step updates
- Progress indicators: Spinners, progress bars, step counters
- Status messages: "Retrieving context...", "Generating response...", "Adding citations..."

**Olympus Application**:

- Agent step indicator updates in real-time during query execution
- Streaming step events: `{"event": "step", "data": {"step": "retrieve", "status": "in_progress"}}`
- Progress messages: "Searching 127 documents...", "Found 5 relevant chunks...", "Generating response with GPT-4..."

**Best Practices**:

- Show progress immediately (<100ms from start of operation)
- Use spinners for indeterminate tasks, progress bars for determinate tasks
- Update status messages frequently (every 1-2 seconds for long operations)
- Handle stale states gracefully (timeout after 30 seconds, show error)

---

### 6. Citation Systems

**Pattern**: Inline references with hover/click for details

**Implementation**:

- **Inline markers**: `[1]`, `[2]`, `[3]` in AI response text
- **Hover preview**: Popover with document title, snippet, similarity score
- **Click action**: Scroll to citation in list OR open document viewer
- **Citation list**: Expandable cards with full metadata (document, page, chunk, score)

**Olympus Application**:

- `InlineCitation` component: Blue badge with number, hoverable
- `CitationPreview` popover: Document title, 2-3 sentence snippet, similarity score bar, "View full citation" link
- `CitationList` component: Expandable cards with:
  - Document name + icon
  - Page number / chunk index
  - Similarity score (visual bar + percentage)
  - Full chunk text (collapsed by default)
  - "View document" button (opens document viewer)

**Best Practices**:

- Use numbered references (not lettered or symbolic) for clarity
- Show hover preview within 200ms (use optimistic loading)
- Include visual metadata (favicon, document icon) for quick scanning
- Provide multiple access paths (hover preview, click to list, "View all citations" link)

---

### 7. Confidence Metrics

**Pattern**: Display certainty levels when available

**Implementation**:

- Overall confidence score (0.0 - 1.0 or percentage)
- Per-citation relevance scores (similarity scores from vector search)
- Context quality indicator (high/medium/low based on number and quality of chunks)
- Uncertainty warnings (e.g., "Limited context available", "Low confidence: verify results")

**Olympus Application**:

- Overall confidence: Displayed below AI response as percentage with color coding
  - High (>70%): Green text, "✓ High confidence"
  - Medium (40-70%): Yellow text, "⚠ Medium confidence"
  - Low (<40%): Red text, "⚠ Low confidence - verify results"
- Confidence breakdown (expandable):
  - Per-citation similarity scores (visual bars)
  - Context quality: "High quality: 5 highly relevant chunks found"
  - Uncertainty reason: "Limited context: only 2 relevant documents found in space"

**Best Practices**:

- Use visual indicators (color, icons) not just numbers
- Provide context for confidence scores (why is it high/low?)
- Show uncertainty prominently (don't hide low confidence)
- Link to actions (e.g., "Low confidence → Upload more documents")

---

### 8. Error Transparency

**Pattern**: Clear error states with retry mechanisms

**Implementation**:

- Show which step failed (in agent step indicator)
- Display specific error reason (not generic "Something went wrong")
- Offer step-specific recovery actions
- Allow retry with error context preserved

**Olympus Application**:

- Error step indicator: Red X on failed step in `AgentStepIndicator`
- Error message: Specific reason (e.g., "Vector search timed out", "No relevant documents found")
- Recovery actions:
  - Retrieve error: "Try uploading more documents" or "Rephrase query"
  - Generate error: "AI service temporarily unavailable - retrying automatically"
  - Cite error: "Citations unavailable but response is valid"
- Retry button: "Try again" with preserved query context

**Best Practices**:

- Show error immediately (don't hide or delay)
- Be specific about what went wrong (avoid jargon but be precise)
- Offer actionable recovery steps (not just "Try again")
- Preserve user context (don't lose query input, uploaded documents)

---

### 9. Tool/Action Visibility

**Pattern**: Show what tools/functions the agent is using

**Implementation**:

- Label each tool invocation (e.g., "Using Vector Search", "Calling OpenAI API")
- Show tool parameters (e.g., "Searching 127 documents", "Using model: gpt-4")
- Display tool results (e.g., "Found 5 chunks", "Generated 234 tokens")

**Olympus Application**:

- Agent step labels: "Retrieving Context" (vector search), "Generating Response" (LLM call), "Adding Citations" (citation extraction)
- Step metadata:
  - Retrieve: "Searched 127 documents, found 5 relevant chunks (avg similarity: 0.82)"
  - Generate: "Generated 234 tokens using gpt-4-turbo"
  - Cite: "Extracted 3 citations with confidence scores"

**Best Practices**:

- Use clear, non-technical labels for primary display (e.g., "Searching documents" not "Executing pgvector similarity search")
- Provide technical details in expandable sections for power users
- Show tool results, not just tool invocations (users care about outcomes)

---

### 10. Source Attribution

**Pattern**: Always cite sources with metadata

**Implementation**:

- Document name, page number, chunk index
- Similarity score (relevance to query)
- Snippet/preview of source text
- Link to full document or chunk

**Olympus Application**:

- Citation metadata includes:
  - `document_title`: "Q4 Financial Report.pdf"
  - `page_number`: 15 (if available)
  - `chunk_index`: 3 (for multi-chunk documents)
  - `similarity_score`: 0.87 (cosine similarity from vector search)
  - `snippet`: 2-3 sentence preview of chunk
  - `document_url`: Link to document viewer (future: deep link to specific chunk)

**Best Practices**:

- Always provide source attribution (never show uncited AI responses)
- Include enough metadata for users to judge credibility (title, page, score)
- Link to full source (don't make users search for it)
- Show preview snippets (let users verify relevance without clicking)

---

## Best Practices (Research-Backed)

This section synthesizes best practices from academic research and industry case studies on AI transparency and explainability.

### Progressive Disclosure Patterns for AI Agents

**Source**: [Agentic Design - Progressive Disclosure Patterns](https://agentic-design.ai/patterns/ui-ux-patterns/progressive-disclosure-patterns)

**Key Principles**:

1. **Define 3 Information Layers**:
   - **Summary**: Essential information for all users (AI response, confidence score, key citations)
   - **Detailed**: Expanded context for engaged users (agent steps, citation details, confidence breakdown)
   - **Technical**: Expert-level debugging info (agent logs, token counts, API parameters)

2. **Use Consistent Expand/Collapse Controls**:
   - Chevron icons (▼ for collapsed, ▲ for expanded)
   - "View details" / "Hide details" links
   - Click on section headers to toggle
   - Consistent placement (right-aligned chevrons, bottom-aligned links)

3. **Implement Smooth Animations**:
   - Height transitions: 200ms ease-in-out
   - Opacity fades: 150ms ease-in-out
   - Maintain scroll position during transitions
   - Use `framer-motion` for complex animations

4. **Remember User Preferences**:
   - Store disclosure state in Zustand or localStorage
   - Respect user patterns (if user always expands citations, default to expanded)
   - Provide global "Always show details" toggle in settings

5. **Avoid Deep Nesting**:
   - Limit to 3-4 disclosure levels max
   - Use tabs or separate panels instead of nested accordions
   - Provide "Expand all" / "Collapse all" for power users

**Application to Olympus**:

- **Level 1 (Summary)**: AI response with inline citations, confidence score (always visible)
- **Level 2 (Detailed)**: Expandable sections for agent steps, citation cards, confidence breakdown (collapsed by default, expand on click)
- **Level 3 (Technical)**: Full agent logs, LangGraph trace, LangSmith links (hidden by default, available via "Advanced" toggle in user settings)

**Implementation Example**:

```tsx
// Default collapsed state
<QueryResponse>
  <AIResponse>{response.text}</AIResponse>
  <ConfidenceScore score={0.87} />
  <InlineCitations citations={response.citations} />

  {/* Expandable sections - collapsed by default */}
  <Collapsible defaultOpen={userPreferences.showAgentSteps}>
    <CollapsibleTrigger>
      View Agent Steps <ChevronDown />
    </CollapsibleTrigger>
    <CollapsibleContent>
      <AgentStepIndicator steps={response.steps} />
    </CollapsibleContent>
  </Collapsible>
</QueryResponse>
```

---

### Trust and Transparency Patterns

**Source**: [Agentic Design - Trust & Transparency Patterns](https://agentic-design.ai/patterns/ui-ux-patterns/trust-transparency-patterns)

**Key Principles**:

1. **Build Trust Through Understanding, Not Blind Faith**:
   - Don't just ask users to "trust the AI" - show them _how_ it works
   - Provide visibility into agent reasoning process (step-by-step execution)
   - Explain confidence scores (why is the AI confident or uncertain?)
   - Show sources and allow users to verify claims

2. **Use "Mindful Friction" for High-Stakes Decisions**:
   - For destructive actions (e.g., database writes, document deletion), require explicit confirmation
   - Show preview of action before execution (e.g., "I will delete 5 documents - confirm?")
   - Add delay or countdown for irreversible actions
   - Example: "This query will modify 127 rows. Review changes below before confirming."

3. **Create Diverse Stakeholder Explanations**:
   - **Technical users**: Show SQL queries, API parameters, token counts
   - **Business users**: Show natural language summaries, visualizations, confidence scores
   - **Auditors**: Provide full execution trace, timestamps, version history
   - Use progressive disclosure to serve all audiences with one UI

4. **Display Uncertainty Ranges and Confidence Metrics**:
   - Always show confidence scores when available
   - Visualize uncertainty (e.g., confidence intervals for predictions)
   - Provide context for low confidence (e.g., "Only 2 relevant documents found - consider uploading more")
   - Use color coding (green = high confidence, yellow = medium, red = low)

5. **Implement Interactive Decision Trees for Reasoning Paths**:
   - Show branching logic (e.g., "If similarity > 0.7, use chunk; else, skip")
   - Allow users to explore "what if" scenarios (e.g., "What if I had 10 documents instead of 5?")
   - Visualize decision points in agent workflow (future enhancement)

**Application to Olympus**:

- **Understanding over Faith**: Show agent steps (retrieve → generate → cite) in real-time, not just final response
- **Mindful Friction**: For future features like database writes or document edits, add confirmation dialogs with previews
- **Diverse Explanations**:
  - **Technical**: Expandable sections for similarity scores, token counts, model parameters
  - **Business**: Clean AI responses with visualizations and confidence scores
  - **Auditors**: LangSmith links, full agent execution logs (advanced mode)
- **Uncertainty Display**: Confidence breakdown with context (e.g., "High confidence: 5 highly relevant chunks found")
- **Interactive Reasoning** (future): Allow users to adjust retrieval parameters (e.g., top-k, similarity threshold) and see how results change

---

### AI Citation Patterns

**Source**: Industry analysis of Perplexity, Claude, ChatGPT citation systems

**Key Principles**:

1. **Point to Exact Passages, Not Broad Documents**:
   - Citation should reference specific chunk, not entire document
   - Include page number, paragraph index, or character range
   - Show snippet/preview of cited text (2-3 sentences)
   - Future: Deep link to exact location in document viewer

2. **Allow Hover for Preview, Click for Full Source**:
   - **Hover**: Quick popover with snippet, document title, similarity score (no click required)
   - **Click**: Scroll to citation in list OR open document viewer at specific chunk
   - **Right-click** (future): Context menu with options (copy citation, view in new tab, exclude from results)

3. **Use Metadata to Help Users Scan Relevance**:
   - **Document title**: "Q4_Financial_Report.pdf"
   - **Favicon/Icon**: Document type icon (PDF, DOCX, TXT)
   - **Source type badge**: "PDF", "Excel", "Database Query Result"
   - **Similarity score**: Visual bar + percentage (e.g., "87% relevant")
   - **Publication date** (if available): "Last modified: Jan 5, 2025"

4. **Balance Speed with Thoroughness**:
   - Show inline citations immediately (don't wait for full citation details)
   - Load citation metadata asynchronously (optimize for perceived speed)
   - Use skeleton loaders for citation cards (avoid layout shift)
   - Prefetch hover preview data on page load (reduce hover latency)

**Application to Olympus**:

- **Exact Passages**: Citations include `chunk_index`, `page_number`, `start_char`, `end_char` for precision
- **Hover + Click**:
  - Hover: `CitationPreview` popover with snippet, title, score (200ms delay)
  - Click: Scroll to citation in `CitationList` and highlight
- **Metadata Display**:
  - Document icon (📄 for PDF, 📊 for Excel, 📝 for TXT)
  - Similarity score bar (green = high, yellow = medium, red = low)
  - Document title and page number
- **Speed Optimization**:
  - Inline citation markers `[1]`, `[2]` rendered immediately during SSE stream
  - Citation metadata loaded asynchronously after response completes
  - Prefetch citation data on component mount

**Implementation Example**:

```tsx
<InlineCitation
  number={1}
  onHover={() => prefetchCitationPreview(1)}
  onClick={() => scrollToCitation(1)}
>
  [1]
</InlineCitation>

<CitationPreview
  citation={{
    title: "Q4 Financial Report.pdf",
    snippet: "Revenue increased by 23% year-over-year...",
    similarity_score: 0.87,
    page_number: 15
  }}
/>
```

---

## Design Principles for Olympus

Based on research findings, we establish the following design principles for Olympus agent transparency:

### 1. **Transparency by Default, Simplicity First**

**Principle**: Show essential information to all users, but keep UI clean and uncluttered

**Implementation**:

- Default view: AI response + inline citations + confidence score (clean, minimal)
- Progressive disclosure: Expandable sections for agent steps, citation details, confidence breakdown (hidden by default)
- Technical details: Advanced mode for power users (LangGraph trace, token counts, API logs)

**Why**: Users need transparency to trust AI, but overwhelming them with details reduces usability. Start simple, allow depth on demand.

---

### 2. **Real-time Visibility Builds Trust**

**Principle**: Show agent activity as it happens, not just final results

**Implementation**:

- Stream agent step updates via SSE (retrieve → generate → cite)
- Display progress indicators during long operations (e.g., "Searching 127 documents...")
- Show checkpoints for major milestones (e.g., "✓ Retrieved 5 relevant chunks")

**Why**: Users trust systems they can observe. Real-time updates reduce anxiety during async operations and help users understand agent behavior.

---

### 3. **User Control & Customization**

**Principle**: Let users adjust transparency level based on expertise and preferences

**Implementation**:

- User settings for transparency preferences:
  - "Show agent steps": Always / On hover / Never
  - "Show confidence details": Always / On demand / Never
  - "Citation display": Inline + List / List only / Inline only
- Remember user choices (Zustand store + localStorage)
- Provide inline controls (e.g., "Hide agent steps" toggle)

**Why**: Power users want maximum transparency; casual users want simplicity. One-size-fits-all doesn't work for diverse user base.

---

### 4. **Hex Aesthetic Across All Transparency Features**

**Principle**: All transparency UI components follow Hex design system

**Implementation**:

- **Colors**:
  - Agent actions: Purple gradient (`bg-gradient-to-r from-purple-500 to-purple-600`)
  - Success states: Green (`text-green-600`, `bg-green-50`)
  - Error states: Red (`text-red-600`, `bg-red-50`)
  - Confidence scores: Green (high), Yellow (medium), Red (low)
- **Typography**: Inter font, 14px base, semibold for labels
- **Spacing**: Generous whitespace, 8px grid system
- **Interactions**: Smooth transitions (200ms), subtle hover effects, focus rings

**Why**: Design consistency across all features (document intelligence + agent transparency) creates cohesive, professional UX.

---

### 5. **Citation Quality Over Quantity**

**Principle**: Show fewer, more relevant citations rather than exhaustive lists

**Implementation**:

- Display top 5-7 citations by default (hide low-relevance citations below threshold)
- Sort by similarity score (most relevant first)
- Provide "View all citations" link for power users
- Visually emphasize high-quality citations (larger cards, green badges)

**Why**: Cognitive load increases with citation count. Curated, high-quality citations are more useful than comprehensive lists.

---

### 6. **Error Transparency & Recovery Guidance**

**Principle**: When things go wrong, show users what happened and how to fix it

**Implementation**:

- Show which agent step failed (in step indicator)
- Display specific error reason (not generic messages)
- Offer actionable recovery steps:
  - "No documents found → Upload documents to this space"
  - "Low confidence → Try rephrasing your query"
  - "API timeout → Retrying automatically in 5 seconds..."
- Allow retry with preserved context

**Why**: Errors are inevitable. Transparent, helpful error messages turn frustration into learning opportunities.

---

## Technical Considerations

### Frontend Architecture

**State Management**:

- **React Query**: Agent step events, citation data (server state)
- **Zustand**: User transparency preferences, expand/collapse states (client state)
- **useState**: Component-local state (hover states, temporary UI states)

**SSE Stream Handling**:

- Extend `useStreamingQuery` hook to parse `step` events
- Maintain step history for replay/debugging
- Handle out-of-order events gracefully (use sequence numbers)

**Performance Optimizations**:

- Lazy-load `AgentStepDetails` component (code-split with `React.lazy`)
- Memoize citation components to prevent unnecessary re-renders (`React.memo`)
- Virtualize citation list if >20 citations (`react-virtual` or `react-window`)
- Prefetch citation preview data on hover (200ms delay)

**Component Organization**:

```
apps/web/src/components/threads/
├── AgentStepIndicator.tsx       # Core step visualization
├── AgentStepDetails.tsx         # Expandable step metadata
├── InlineCitation.tsx           # Inline [N] markers
├── CitationPreview.tsx          # Hover popover
├── CitationList.tsx             # Full citation cards
├── ConfidenceBreakdown.tsx      # Confidence details
└── ErrorStepIndicator.tsx       # Error state display
```

---

### Backend Architecture

**LangGraph Integration**:

- **Option A**: Modify `query_agent.py` nodes to emit SSE events
- **Option B**: Add middleware/hooks to StateGraph for event emission
- **Recommendation**: Option B (cleaner separation of concerns)

**SSE Event Schema**:

```python
# Step events
{
  "event": "step",
  "data": {
    "step": "retrieve" | "generate" | "cite",
    "status": "in_progress" | "completed" | "error",
    "metadata": {
      # Step-specific metadata
      "chunks_found": 5,
      "similarity_scores": [0.87, 0.82, 0.75, 0.71, 0.68],
      "tokens_generated": 234,
      "citations_extracted": 3
    }
  }
}

# Token events (existing)
{
  "event": "token",
  "data": "Generated text..."
}

# Citation events (existing)
{
  "event": "citation",
  "data": {
    "index": 1,
    "document_id": "uuid",
    "chunk_index": 3,
    "similarity_score": 0.87
  }
}
```

**Error Handling**:

- Emit `step` event with `status: "error"` before closing SSE stream
- Include `error_message` and `recovery_suggestion` in metadata
- Log errors to LangSmith for debugging

---

### Database Schema

**No changes required** for MVP. Current schema already supports:

- `document_chunks` table with `similarity_score` (for citation metadata)
- `queries` table with `confidence_score` (for overall confidence)
- `citations` table with full metadata (document_id, chunk_index, page_number)

**Future enhancements** (Phase 7+):

- `agent_execution_logs` table: Store full agent step traces for analytics and debugging
- `user_preferences` table: Persist transparency settings per user

---

## Success Metrics

### User Understanding (Primary Metric)

**Question**: "Do you understand how the AI generated this response?"

**Target**: >80% "Yes" or "Mostly yes"

**Measurement**: In-app survey (post-query popup, 10% sample rate)

---

### Trust (Primary Metric)

**Question**: "Do you trust the AI's response?"

**Target**: >85% "Yes" or "Mostly yes"

**Measurement**: In-app survey (post-query popup, 10% sample rate)

---

### Engagement (Secondary Metric)

**Metrics**:

1. **Agent step expansion rate**: % of users who expand agent steps
   - **Target**: >30% (power users)
2. **Citation interaction rate**: % of users who hover or click citations
   - **Target**: >40%
3. **Average time spent reviewing agent details**
   - **Target**: +20% vs. baseline (pre-transparency UI)

**Measurement**: Frontend analytics (PostHog or similar)

---

### Performance (Secondary Metric)

**Metrics**:

1. **SSE stream latency**: Time from step start to UI update
   - **Target**: <100ms per step event
2. **UI render time**: Time to update agent step indicator
   - **Target**: <50ms
3. **Citation popover load time**: Time from hover to preview display
   - **Target**: <200ms

**Measurement**: Browser performance API, Sentry monitoring

---

### Error Recovery (Secondary Metric)

**Metrics**:

1. **Retry rate after error**: % of users who click "Retry" after error
   - **Target**: >60% (vs. <15% abandon)
2. **Error understanding**: "Did you understand what went wrong?" survey
   - **Target**: >75% "Yes"

**Measurement**: Error event tracking + in-app survey

---

## References & Further Reading

### Platform Documentation

1. **Hex**:
   - [Hex Threads Documentation](https://hex.tech/product/threads/)
   - [Hex Design Philosophy](https://hex.tech/blog/threads-launch/)
   - [Hex Notebook Conversion](https://hex.tech/blog/threads-to-notebooks/)

2. **Perplexity**:
   - [Perplexity Homepage](https://www.perplexity.ai/)
   - [Perplexity Blog](https://blog.perplexity.ai/)

3. **Claude (Anthropic)**:
   - [Extended Thinking Documentation](https://www.anthropic.com/news/extended-thinking)
   - [Anthropic Research on Transparency](https://www.anthropic.com/research)

4. **ChatGPT (OpenAI)**:
   - [ChatGPT Plugins](https://platform.openai.com/docs/plugins)
   - [Code Interpreter Announcement](https://openai.com/blog/chatgpt-plugins)

5. **Cursor AI**:
   - [Cursor Documentation](https://cursor.sh/)
   - [Cursor Blog](https://cursor.sh/blog)

6. **V0 by Vercel**:
   - [V0 Homepage](https://v0.dev/)
   - [Generative UI Blog Post](https://vercel.com/blog/ai-sdk-3-generative-ui)

7. **Replit Agent**:
   - [Replit Agent Documentation](https://replit.com/agent)
   - [Agent Launch Blog Post](https://blog.replit.com/agent)

---

### Research Papers & Articles

1. **Progressive Disclosure**:
   - [Agentic Design - Progressive Disclosure Patterns](https://agentic-design.ai/patterns/ui-ux-patterns/progressive-disclosure-patterns)
   - Nielsen Norman Group: "Progressive Disclosure" (classic UX research)

2. **Trust & Transparency in AI**:
   - [Agentic Design - Trust & Transparency Patterns](https://agentic-design.ai/patterns/ui-ux-patterns/trust-transparency-patterns)
   - Google PAIR: "People + AI Guidebook" (transparency best practices)
   - Microsoft: "Guidelines for Human-AI Interaction" (19 design guidelines)

3. **Explainable AI (XAI)**:
   - "Explanation in Artificial Intelligence: Insights from the Social Sciences" (Miller, 2019)
   - "Interpretable Machine Learning" (Christoph Molnar) - free online book
   - DARPA XAI Program overview

4. **Citation Systems**:
   - Analysis of Perplexity, Claude, ChatGPT citation UX (informal industry research)
   - Academic research on "provenance" in AI systems

---

### Olympus Internal Documentation

1. **Design System**:
   - [HEX_DESIGN_SYSTEM.md](./HEX_DESIGN_SYSTEM.md) - Complete design patterns and visual reference
   - [hex-component-mapping.md](./guides/hex-component-mapping.md) - Component implementation guide

2. **Architecture**:
   - [Frontend Guide](./guides/frontend-guide.md) - SSE streaming, React Query patterns
   - [Backend Guide](./guides/backend-guide.md) - LangGraph integration, GraphQL schema
   - [Vector Search Guide](./guides/vector-search-guide.md) - Retrieval architecture

3. **AI/ML Layer**:
   - [HYBRID_ARCHITECTURE.md](./HYBRID_ARCHITECTURE.md) - Multi-agent system overview
   - [ADR-002: AI Orchestration](./adr/002-ai-orchestration.md) - LangGraph vs. CrewAI decision

---

## Appendix: Implementation Checklist

### Phase 1: Agent Step Visualization ✅

**Frontend**:

- [ ] Create `AgentStepIndicator.tsx` component
- [ ] Update `QueryResponse.tsx` to display step indicator
- [ ] Extend `useStreamingQuery.ts` to parse `step` events
- [ ] Add step state management (current step, step history)
- [ ] Implement Hex aesthetic styling (purple gradient, green checkmarks)

**Backend**:

- [ ] Emit `step` events in `routes/queries.py` SSE stream
- [ ] Add step metadata (chunks_found, tokens_generated, citations_extracted)
- [ ] Update LangGraph workflow to emit events before each node
- [ ] Test SSE event ordering and timing

**Testing**:

- [ ] Unit tests for step parsing logic
- [ ] Integration tests for SSE stream with step events
- [ ] Manual testing: verify steps update in real-time
- [ ] Performance testing: SSE latency <100ms

---

### Phase 2: Progressive Disclosure ✅

**Frontend**:

- [ ] Create `AgentStepDetails.tsx` component
- [ ] Make each step in `AgentStepIndicator` clickable
- [ ] Implement expand/collapse animation (200ms smooth transition)
- [ ] Create Zustand store for transparency preferences
- [ ] Add "Always show details" toggle in settings

**Backend**:

- [ ] Enhance step metadata with rich details (chunk texts, similarity scores, model name)
- [ ] Add metadata to each step event

**Testing**:

- [ ] Unit tests for expand/collapse state management
- [ ] Manual testing: verify smooth animations
- [ ] User testing: validate progressive disclosure UX

---

### Phase 3: Enhanced Citations ✅

**Frontend**:

- [ ] Create `InlineCitation.tsx` component (clickable badges)
- [ ] Create `CitationPreview.tsx` popover (hover preview)
- [ ] Update `MarkdownContent.tsx` to replace `[N]` with `InlineCitation`
- [ ] Upgrade `CitationList.tsx` with expandable cards
- [ ] Add similarity score visualization (bars + percentages)

**Backend**:

- [ ] Add `snippet` field to citation objects (2-3 sentence preview)
- [ ] Include `chunk_url` for deep linking (future)
- [ ] Optimize citation metadata loading (async after response)

**Testing**:

- [ ] Unit tests for citation parsing and replacement
- [ ] Manual testing: verify hover preview latency <200ms
- [ ] Accessibility testing: keyboard navigation, screen readers

---

### Phase 4: Confidence Breakdown ✅

**Frontend**:

- [ ] Create `ConfidenceBreakdown.tsx` component
- [ ] Add "View Confidence Details" link to `QueryMessage`
- [ ] Display per-citation relevance scores (visual bars)
- [ ] Show context quality indicator (high/medium/low)
- [ ] Display uncertainty warnings (when confidence <0.5)

**Backend**:

- [ ] Calculate `context_quality` based on similarity scores
- [ ] Add `uncertainty_reason` field (when confidence low)
- [ ] Include `per_citation_scores` array in response metadata

**Testing**:

- [ ] Unit tests for confidence calculation logic
- [ ] Manual testing: verify color coding (green/yellow/red)
- [ ] User testing: validate confidence breakdown clarity

---

### Phase 5: User Preferences ✅

**Frontend**:

- [ ] Create `TransparencySettings.tsx` panel
- [ ] Add 4 preference options (steps visibility, confidence, citations, default state)
- [ ] Create `transparency-store.ts` Zustand store
- [ ] Update all components to respect user preferences
- [ ] Persist preferences to localStorage

**Testing**:

- [ ] Unit tests for preference storage and retrieval
- [ ] Manual testing: verify preferences applied across sessions
- [ ] User testing: validate settings UI clarity

---

### Phase 6: Error Transparency ✅

**Frontend**:

- [ ] Create `ErrorStepIndicator.tsx` component
- [ ] Update `QueryResponse.tsx` to show error step
- [ ] Display specific error reasons (not generic messages)
- [ ] Add step-specific recovery actions
- [ ] Implement retry mechanism with preserved context

**Backend**:

- [ ] Emit `step` events with `status: "error"`
- [ ] Include `error_message` and `recovery_suggestion` in metadata
- [ ] Log errors to LangSmith for debugging

**Testing**:

- [ ] Unit tests for error parsing and display
- [ ] Integration tests: simulate API errors, timeouts
- [ ] Manual testing: verify recovery actions work correctly

---

## Document Metadata

**Author**: Research conducted by Kwame Amosah

**Date**: January 2025

**Last Updated**: January 5, 2025

**Related Issues**:

- [LOG-192](https://linear.app/logarithmic/issue/LOG-192) - Implement Agent Transparency UI

**Status**: ✅ Research Complete → Implementation Planning

**Next Steps**:

1. Review research document with team
2. Prioritize implementation phases (recommend: Phase 1 → Phase 3 → Phase 2)
3. Create sub-issues for each phase in Linear
4. Begin Phase 1 implementation (Agent Step Visualization)
