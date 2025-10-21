import type { Meta, StoryObj } from '@storybook/nextjs';
import { MarkdownContent } from './MarkdownContent';

const meta = {
  title: 'Common/MarkdownContent',
  component: MarkdownContent,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MarkdownContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic markdown with headings and paragraphs.
 */
export const BasicFormatting: Story = {
  args: {
    content: `# Heading 1

This is a paragraph with **bold text** and *italic text*.

## Heading 2

This is another paragraph with \`inline code\` and a [link](https://example.com).

### Heading 3

> This is a blockquote with some important information.`,
  },
};

/**
 * Code blocks with syntax highlighting.
 */
export const CodeBlocks: Story = {
  args: {
    content: `Here's a Python code example:

\`\`\`python
def calculate_risk_score(document):
    """Calculate risk score from document analysis."""
    risk_factors = extract_risk_factors(document)
    weights = [0.3, 0.5, 0.2]

    return sum(factor * weight for factor, weight in zip(risk_factors, weights))
\`\`\`

And a JavaScript example:

\`\`\`javascript
const fetchDocuments = async (spaceId) => {
  const response = await fetch(\`/api/spaces/\${spaceId}/documents\`);
  return response.json();
};
\`\`\``,
  },
};

/**
 * Lists and task lists (GitHub-flavored markdown).
 */
export const Lists: Story = {
  args: {
    content: `## Unordered List

- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
- Item 3

## Ordered List

1. First step
2. Second step
3. Third step

## Task List

- [x] Completed task
- [x] Another completed task
- [ ] Pending task
- [ ] Another pending task`,
  },
};

/**
 * Tables (GitHub-flavored markdown).
 */
export const Tables: Story = {
  args: {
    content: `## Risk Analysis Summary

| Risk Factor | Severity | Likelihood | Mitigation |
|-------------|----------|------------|------------|
| Data breach | High | Medium | Encryption |
| System failure | Critical | Low | Redundancy |
| Compliance | Medium | High | Audit trail |
| Access control | High | Medium | MFA |`,
  },
};

/**
 * AI response example with citations.
 */
export const AIResponse: Story = {
  args: {
    content: `Based on the analysis of your documents, here are the key findings:

## Executive Summary

The financial projections show **strong growth potential** with a projected CAGR of 25% over the next 3 years [1]. However, there are several risk factors to consider:

1. **Market volatility**: The current market conditions present uncertainty [2]
2. **Competition**: New entrants are increasing competitive pressure [3]
3. **Regulatory changes**: Pending legislation may impact operations [1]

## Recommendations

- Diversify revenue streams to mitigate risk
- Invest in \`customer retention\` programs
- Monitor regulatory developments closely

> **Note**: These findings are based on data current as of the document upload date.

For technical implementation details, refer to the following code pattern:

\`\`\`typescript
interface RiskAssessment {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  likelihood: number;
  mitigation: string;
}
\`\`\``,
  },
};

/**
 * Mixed content with all features.
 */
export const MixedContent: Story = {
  args: {
    content: `# Comprehensive Markdown Example

## Text Formatting

This paragraph demonstrates **bold**, *italic*, ***bold italic***, and ~~strikethrough~~ text.

## Links

- External link: [Visit Example](https://example.com)
- Internal link: [Go to Dashboard](/dashboard)

## Code

Inline code: \`const greeting = "Hello, World!";\`

Code block:

\`\`\`json
{
  "name": "olympus-mvp",
  "version": "1.0.0",
  "description": "AI-powered document intelligence"
}
\`\`\`

## Blockquote

> "The best way to predict the future is to invent it."
> — Alan Kay

## List

- Feature 1
  - Sub-feature 1.1
  - Sub-feature 1.2
- Feature 2
- Feature 3

## Table

| Feature | Status | Priority |
|---------|--------|----------|
| Document upload | ✅ Complete | High |
| AI queries | 🚧 In Progress | High |
| Collaboration | 📋 Planned | Medium |`,
  },
};

/**
 * Empty content.
 */
export const Empty: Story = {
  args: {
    content: '',
  },
};
