# ADR-002: AI Agent Orchestration Strategy

**Status**: Proposed
**Date**: 2025-10-19
**Deciders**: Engineering Team
**Technical Story**: LOG-136 (LangChain/LangGraph setup), Future Phase 3-4 work

---

## Context

The Olympus MVP requires an AI agent system capable of handling multiple levels of complexity:

1. **Simple queries**: Single-document Q&A with citations (e.g., "What are the key risks in this 10-K?")
2. **Multi-document research**: Synthesis across multiple sources (e.g., "Compare YoY revenue growth across all quarterly reports")
3. **Specialized analysis**: Domain-specific workflows (financial analysis, legal review, market research)
4. **Workflow automation**: User-defined multi-step processes (e.g., "When SEC filing uploaded → Extract key metrics → Flag material changes → Generate alert")

The Product Requirements Document (PRD) explicitly identifies **multi-agent workflows** (line 525) and **workflow automation** (lines 158-167) as future features inspired by Athena Intelligence's capabilities.

We currently have LangGraph implemented (LOG-136) for simple RAG queries with a retrieve → generate → cite workflow. The question is: **Should we continue with LangGraph for all agent orchestration, or introduce CrewAI for complex multi-agent workflows?**

## Decision

We will adopt a **hybrid AI agent orchestration approach**:

### 1. LangGraph for Simple RAG Queries

- Single-agent workflows (retrieve → generate → cite)
- Fast, deterministic query responses
- Direct control over agent state and transitions
- Already implemented in LOG-136

### 2. CrewAI for Complex Multi-Agent Orchestration

- Multi-document research synthesis
- Domain-specific agent teams (financial, legal, research)
- Workflow automation with specialized agents
- Hierarchical and sequential task coordination

### 3. Unified LLM Configuration

- Both frameworks use shared `app/services/langchain_config.py` for LLM instances
- Single source of truth for model configuration
- Consistent LangSmith observability across both systems

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              AI AGENT ORCHESTRATION LAYERS                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SIMPLE QUERIES → LangGraph (Current)                       │
│  - Single-document Q&A                                      │
│  - Basic RAG: retrieve → generate → cite                    │
│  - Fast response time (< 10s)                               │
│  - SSE streaming for real-time UI updates                  │
│  - Use case: "What are the key risks in this filing?"      │
│                                                             │
│  COMPLEX RESEARCH → CrewAI (Phase 3+)                       │
│  - Multi-document synthesis                                 │
│  - Specialized agent teams                                  │
│  - Sequential/parallel/hierarchical orchestration           │
│  - Use case: "Analyze all Q1 earnings and compare YoY"     │
│                                                             │
│  WORKFLOW AUTOMATION → CrewAI (Phase 4+)                    │
│  - User-defined workflows                                   │
│  - Trigger-based actions                                    │
│  - Scheduled research tasks                                 │
│  - Use case: "Daily SEC filing monitor → extract → alert"  │
│                                                             │
│  SHARED INFRASTRUCTURE                                      │
│  - LangChain LLM configuration                              │
│  - LangSmith observability                                  │
│  - Vector store (pgvector)                                  │
│  - Document processing pipeline                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Rationale

### Why NOT LangGraph for Everything?

**Cons of LangGraph-only approach:**

1. **Manual multi-agent coordination**: Requires complex state graphs to coordinate multiple specialized agents
2. **Boilerplate overhead**: Each agent team requires custom StateGraph definition and edge management
3. **Role complexity**: No built-in concept of agent roles, backstories, or domain expertise
4. **Process patterns**: Must manually implement sequential, parallel, and hierarchical patterns
5. **Developer experience**: More code to maintain for complex workflows

**Pros of LangGraph we're keeping:**

1. ✅ **Granular control** → Perfect for simple, deterministic RAG workflows
2. ✅ **Performance** → Minimal abstraction layer for fast query responses
3. ✅ **State visibility** → Direct access to agent state at each step
4. ✅ **Already implemented** → LOG-136 complete, working in production

### Why CrewAI for Complex Workflows?

**Pros:**

1. **Purpose-built for multi-agent orchestration**: Designed specifically for coordinating specialized agents
2. **Role-based agents**: Built-in support for agent roles, goals, backstories, and tools
3. **Process patterns**: Sequential, parallel, and hierarchical processes out-of-the-box
4. **Less boilerplate**: Define agent team with simple configuration vs complex state graphs
5. **Domain specialization**: Natural fit for finance, legal, research agent teams
6. **Task dependencies**: Automatic handling of task context and dependencies
7. **Production-ready**: Used by enterprise teams for similar research workflows

**Cons:**

1. Additional framework to maintain (mitigated by shared LangChain foundation)
2. Less granular control than LangGraph (acceptable for high-level orchestration)
3. Abstraction layer may hide some behavior (trade-off for developer experience)

### Why NOT LangChain Agents?

**Standard LangChain agents** (ReAct, OpenAI Functions) are less suitable because:

1. **Single-agent focus**: Designed for one agent with multiple tools, not agent teams
2. **Limited orchestration**: No built-in patterns for coordinating multiple agents
3. **State management**: Requires manual state handling for complex workflows
4. **Process control**: Limited support for sequential/parallel task execution

### Comparison with Alternatives

| Feature               | LangGraph Only | CrewAI Only | LangGraph + CrewAI (Hybrid) ✅ |
| --------------------- | -------------- | ----------- | ------------------------------ |
| Simple Q&A            | Excellent      | Good        | Excellent ✅                   |
| Multi-agent workflows | Manual         | Built-in    | Built-in ✅                    |
| Response time         | Fast           | Slower      | Fast for simple, flexible ✅   |
| Domain specialization | Manual         | Natural     | Natural ✅                     |
| Workflow automation   | Complex        | Easy        | Easy ✅                        |
| Developer experience  | Moderate       | Good        | Best of both ✅                |
| Learning curve        | Steep          | Gentle      | Gradual (start simple) ✅      |
| Production complexity | Low            | Moderate    | Moderate ✅                    |
| Bundle size           | Small          | Larger      | Larger (acceptable) ✅         |
| Observability         | LangSmith      | LangSmith   | LangSmith ✅                   |

## Use Case Mapping

### LangGraph Use Cases (Current)

1. **Single-document Q&A**: "What are the main risks in this 10-K filing?"
2. **Quick fact extraction**: "What was the revenue in Q3 2024?"
3. **Simple research**: "Summarize the key findings in this report"
4. **Real-time queries**: User expects fast response with streaming

**Implementation**: `app/agents/query_agent.py` with retrieve → generate → cite workflow

### CrewAI Use Cases (Phase 3-4)

#### Financial Analysis (Lines 241-245 PRD)

**Crew**: Financial Analysis Team

- **Data Extractor Agent**: Extract revenue, profit, debt from multiple filings
- **Trend Analyzer Agent**: Identify YoY/QoQ trends and patterns
- **Risk Assessor Agent**: Flag material changes and financial risks
- **Report Generator Agent**: Synthesize findings with citations

**Example Query**: "Analyze the last 4 quarters of earnings reports and identify top 3 financial risks with supporting evidence"

#### Legal Review (Lines 247-251 PRD)

**Crew**: Contract Analysis Team

- **Clause Extractor Agent**: Identify key contract clauses across documents
- **Compliance Checker Agent**: Verify regulatory compliance
- **Risk Identifier Agent**: Flag non-standard or risky clauses
- **Summary Agent**: Generate contract review summary

**Example Query**: "Review these 50 contracts and flag any non-standard indemnification clauses"

#### Market Research (Lines 253-257 PRD)

**Crew**: Competitive Intelligence Team

- **Data Collector Agent**: Extract competitor metrics and positioning
- **Sentiment Analyzer Agent**: Analyze sentiment from reports and media
- **Trend Identifier Agent**: Identify market trends and patterns
- **Synthesis Agent**: Generate competitive landscape report

**Example Query**: "Compare competitor positioning across all market research reports from Q3 2024"

#### Workflow Automation (Lines 158-167 PRD)

**Crew**: SEC Filing Monitor (scheduled daily)

- **Fetcher Agent**: Download new SEC filings for tracked companies
- **Extractor Agent**: Extract material changes and key metrics
- **Comparator Agent**: Compare against previous filings
- **Alert Agent**: Generate alerts for significant changes

**Trigger**: Scheduled task (daily at market close)

## Consequences

### Positive

- **Best tool for each job**: LangGraph for speed, CrewAI for orchestration
- **Gradual complexity**: Start with simple queries, add crews as needed
- **Domain specialization**: Natural agent teams for finance, legal, research
- **Future-proof**: Supports PRD's multi-agent and automation goals
- **Developer productivity**: Less boilerplate for complex workflows
- **Enterprise alignment**: Matches Athena Intelligence's capabilities

### Negative

- **Two frameworks to maintain**: More dependencies and potential complexity
- **Learning curve**: Team needs to understand both LangGraph and CrewAI
- **Bundle size increase**: Additional ~500kb for CrewAI (acceptable for backend)
- **Decision overhead**: Must choose correct framework for each use case
- **Testing complexity**: Need test strategies for both simple and complex agents

### Neutral

- **Migration path**: Can consolidate to single framework later if needed
- **Shared foundation**: Both use LangChain, so concepts transfer
- **Not appropriate for all use cases**: But perfect for multi-level agent complexity

### Risks and Mitigations

| Risk                                      | Mitigation                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| CrewAI adds too much complexity           | Start with simple crew (financial analysis POC), validate value before scale |
| Performance degradation for complex crews | Profile and optimize, add caching layer for crew results                     |
| Framework conflicts or integration issues | Use shared LangChain configuration, comprehensive integration tests          |
| Team struggles to learn both frameworks   | Comprehensive documentation, internal workshops, clear use case guidelines   |
| Maintenance burden of two systems         | Consolidate shared code, use same observability (LangSmith) for both         |
| CrewAI may not meet needs                 | Build escape hatch to pure LangGraph if needed, evaluate in Phase 3          |

## Implementation Plan

### Phase 1-2 (Current - Complete)

- ✅ LangGraph RAG agent implemented (LOG-136)
- ✅ SSE streaming for real-time responses
- ✅ Single-agent query workflow functional

### Phase 3 (AI Agent Enhancement - Q1 2025)

1. **Add CrewAI dependency** to `pyproject.toml`
2. **Create proof-of-concept** financial analysis crew
3. **Build CrewAI orchestrator service** at `app/services/crew_orchestrator.py`
4. **Add multi-document research endpoint** for crew-based queries
5. **Implement crew result caching** for performance
6. **LangSmith integration** for crew observability

### Phase 4 (Workflow Automation - Q2 2025)

1. **User-defined workflow UI** for creating agent teams
2. **Scheduled workflow execution** (daily/weekly research tasks)
3. **Trigger-based workflows** (document upload → crew processing)
4. **Workflow templates** for common use cases (financial, legal, research)

### Decision Framework

**Use LangGraph when:**

- Single-document query
- User expects response in < 10 seconds
- Simple retrieve → generate → cite pattern
- Need granular control over agent state

**Use CrewAI when:**

- Multi-document research synthesis
- Domain-specific analysis (finance, legal, research)
- Complex workflow with multiple specialized steps
- User-defined automation workflows

## Technical Implementation

### Shared Configuration

```python
# app/services/langchain_config.py (already exists)
def get_llm(streaming: bool = True, **kwargs) -> ChatOpenAI:
    """Shared LLM configuration for both LangGraph and CrewAI."""
    # ... existing implementation
```

### LangGraph Agent (Current)

```python
# app/agents/query_agent.py (already exists)
def create_query_agent() -> CompiledStateGraph:
    """Simple RAG workflow: retrieve → generate → cite."""
    workflow = StateGraph(AgentState)
    workflow.add_node("retrieve", retrieve_context)
    workflow.add_node("generate", generate_response)
    workflow.add_node("cite", add_citations)
    # ... edges and compilation
```

### CrewAI Orchestrator (Future)

```python
# app/services/crew_orchestrator.py (to be created)
from crewai import Crew, Agent, Task
from app.services.langchain_config import get_llm

class ResearchOrchestrator:
    """Orchestrate complex research workflows with specialized agent teams."""

    def create_financial_analysis_crew(
        self, documents: list[Document]
    ) -> Crew:
        """Create crew for financial document analysis."""

        # Shared LLM configuration
        llm = get_llm(streaming=False)

        # Specialized agents
        extractor = Agent(
            role='Financial Data Extractor',
            goal='Extract key metrics from financial statements',
            backstory='Expert in GAAP accounting and SEC filings',
            tools=[document_reader, table_extractor],
            llm=llm
        )

        analyst = Agent(
            role='Financial Analyst',
            goal='Analyze trends and identify risks',
            backstory='Former equity research analyst',
            tools=[calculation_tools, risk_assessment],
            llm=llm
        )

        # Sequential tasks with dependencies
        tasks = [
            Task(
                description=f"Extract financial metrics from {len(documents)} filings",
                agent=extractor,
                expected_output="Structured JSON with revenue, profit, debt"
            ),
            Task(
                description="Analyze trends and identify top 3 risks",
                agent=analyst,
                expected_output="Risk analysis with citations",
                context=[tasks[0]]  # Depends on extraction
            )
        ]

        return Crew(
            agents=[extractor, analyst],
            tasks=tasks,
            process='sequential',
            verbose=True  # Enable LangSmith logging
        )

    async def run_research_workflow(
        self,
        workflow_type: str,
        documents: list[Document]
    ) -> dict:
        """Execute specialized research workflow."""

        if workflow_type == 'financial_analysis':
            crew = self.create_financial_analysis_crew(documents)
        elif workflow_type == 'legal_review':
            crew = self.create_legal_review_crew(documents)
        # ... more workflows

        result = await crew.kickoff_async()
        return result
```

### API Endpoint Integration

```python
# app/routes/query_stream.py (extend existing)

@router.post("/research/crew")
async def run_crew_research(
    workflow_type: str,
    space_id: UUID,
    background_tasks: BackgroundTasks
) -> dict:
    """Run complex research workflow with CrewAI."""

    # Get documents from space
    documents = await document_service.get_documents(space_id)

    # Run crew in background
    background_tasks.add_task(
        crew_orchestrator.run_research_workflow,
        workflow_type=workflow_type,
        documents=documents
    )

    return {"status": "processing", "workflow_type": workflow_type}
```

## References

- [Product Requirements Document](../PRODUCT_REQUIREMENTS.md) - Lines 525 (multi-agent), 158-167 (workflows)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [CrewAI Documentation](https://docs.crewai.com/)
- [LangChain Documentation](https://python.langchain.com/docs/get_started/introduction)
- [LangSmith for Multi-Agent Systems](https://docs.smith.langchain.com/)
- [Athena Intelligence Case Study](https://blog.langchain.com/customers-athena-intelligence/) - Inspiration for architecture
- LOG-136: LangChain/LangGraph Setup (completed)

## Approval

**Decision**: 🚧 Proposed (Pending Team Review)
**Date**: 2025-10-19
**Revisit Date**: After Phase 3 POC validation (Q1 2025)

## Next Steps

1. **Proof of Concept (Phase 3 Start)**:
   - [ ] Add CrewAI dependency to `pyproject.toml`
   - [ ] Build financial analysis crew POC
   - [ ] Validate performance and observability
   - [ ] Document developer experience

2. **Production Implementation (Phase 3)**:
   - [ ] Create `app/services/crew_orchestrator.py`
   - [ ] Build 3 domain-specific crews (financial, legal, research)
   - [ ] Add crew-based query endpoints
   - [ ] Comprehensive integration tests

3. **Workflow Automation (Phase 4)**:
   - [ ] User-defined workflow UI
   - [ ] Scheduled and trigger-based execution
   - [ ] Workflow templates library

4. **Observability & Monitoring**:
   - [ ] LangSmith integration for crew tracing
   - [ ] Performance benchmarks (LangGraph vs CrewAI)
   - [ ] Error tracking and alerting

---

_This ADR complements ADR-001 (State Management) by defining the AI agent layer architecture. The hybrid approach (LangGraph + CrewAI) mirrors the hybrid state management approach (React Query + Zustand) - using the best tool for each specific use case._
