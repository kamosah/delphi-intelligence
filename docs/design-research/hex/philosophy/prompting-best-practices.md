# Hex Notebook Agent - Prompting Best Practices

> **Source:** https://hex.tech/blog/notebook-agent-prompting-guide-agentic-analytics/
> **Author:** Alex Brumas, Hex
> **Purpose:** Copy-paste prompt templates and techniques for effective agent use

## Overview

This guide contains **proven prompt templates** from Hex's official prompting guide. These patterns maximize agent effectiveness and reduce iteration time.

---

## Core Prompting Principles

### 1. Structured Thinking

Frame requests with: **Context → Task → Guidelines → Constraints**

**Template:**

```
Context: [What are you analyzing and why?]
Task: [What specific analysis to perform]
Guidelines: [Methods to use, approaches to take]
Constraints: [What to avoid, data limitations]
```

**Example:**

```
Context: Analyzing customer behavior for Q4 retention campaign
Task: Perform cohort analysis to determine retention rates by acquisition month
Guidelines: Use RFM (recency, frequency, monetary) methodology, compare cohorts by first purchase date
Constraints: Only include customers with at least 2 purchases, exclude wholesale customers
```

### 2. Conversational Style (with Specificity)

Most prompting is like "sending a DM to a peer" — natural language works, but include analytical details.

**Good:** "Analyze @sales_table for trends, focusing on revenue by product category over time"

**Bad:** "Analyze sales" (too vague)

### 3. Meta-Prompting

Build a plan first, then feed it back for execution.

**Step 1:** "Create a plan for analyzing customer lifetime value"
**Step 2:** Copy plan, paste: "Execute this plan: [paste detailed plan]"

**Benefit:** Reduces agent confusion on complex multi-step analyses

### 4. Scope Context with @ Tags

Direct agent's attention to specific data sources.

**Example:**

```
Analyze @customer_transactions table, focusing on 'purchase_frequency'
and 'customer_lifetime_value' columns
```

---

## Copy-Paste Prompt Templates

### Data Discovery

#### Template 1: Find Relevant Data

```
Help me discover data in the warehouse related to [TOPIC].
List relevant semantic models, schemas, and tables with brief
descriptions of metrics and dimensions available.
```

**Use Case:** Starting new analysis, unfamiliar data

---

#### Template 2: Schema Exploration

```
Browse the @[TABLE_NAME] schema and provide:
1. Column names and data types
2. Sample values for each column
3. Suggestions for common analyses based on this structure
```

**Use Case:** Understanding new table structure

---

### Analysis Planning

#### Template 3: Approach Recommendations

```
I want to analyze [BUSINESS_QUESTION]. Suggest 2-3 analytical
approaches (e.g., cohort analysis, trend analysis, segmentation),
explaining the trade-offs of each method.
```

**Use Case:** Unsure which analytical technique to apply

---

#### Template 4: Multi-Step Plan

```
Create a detailed plan for:
[ANALYSIS_GOAL]

Break down into:
1. Data preparation steps
2. Analysis methodology
3. Expected outputs
4. Validation checks
```

**Use Case:** Complex, multi-part analyses

---

### Data Cleaning & Preparation

#### Template 5: Handle Missing Values

```
Analyze @[DATAFRAME] for missing values. For each column:
1. Report % missing
2. Suggest imputation method (mean, median, mode, forward-fill)
3. Flag columns where > 30% missing (consider dropping)
```

---

#### Template 6: Detect Outliers

```
Identify outliers in @[DATAFRAME] using:
- IQR method for numeric columns
- Z-score for normally distributed data
- Visual inspection via box plots

Flag extreme values for review before removing.
```

---

### Clustering & Segmentation

#### Template 7: K-Means Clustering

```
Cluster customer data using k-means with RFM features (recency,
frequency, monetary value).

Steps:
1. Use @[CUSTOMER_TABLE], calculating RFM scores
2. Handle missing values by [METHOD]
3. Normalize features using StandardScaler
4. Determine optimal clusters via elbow method (test k=2 to k=10)
5. Visualize segments with scatter plot
6. Profile each segment with summary statistics
```

---

#### Template 8: Customer Segmentation

```
Segment customers from @[TABLE] based on:
- Purchase frequency
- Average order value
- Product category preferences
- Time since last purchase

Create 3-5 meaningful segments with business-friendly names
(e.g., "High-Value Loyalists", "At-Risk Churners").
```

---

### Predictive Modeling

#### Template 9: Churn Prediction

```
Build a churn prediction model:

Data: @[CUSTOMER_TABLE]
Target: 'churned' column (binary)
Features: Include behavioral, demographic, and transactional data

Steps:
1. Feature engineering (recency, frequency, etc.)
2. Train/test split (80/20)
3. Random forest classifier with scikit-learn
4. Identify top 10 contributing factors
5. Report accuracy, precision, recall, F1 score
6. Flag high-risk customers for retention campaign
```

---

#### Template 10: Feature Selection

```
Perform feature selection for @[DATAFRAME] to predict [TARGET_VARIABLE]:

Methods:
1. Correlation analysis (remove high correlation > 0.9)
2. Feature importance from tree-based model
3. Recursive feature elimination (RFE)

Recommend final feature set with justification.
```

---

### Time Series Analysis

#### Template 11: Trend & Seasonality

```
Analyze @[TIME_SERIES_TABLE] to identify:
1. Overall trend (increasing/decreasing/stable)
2. Seasonal patterns (weekly, monthly, quarterly)
3. Anomalies or outliers in the time series

Use decomposition (additive or multiplicative based on data).
Visualize components separately.
```

---

#### Template 12: Sales Forecasting

```
Forecast sales for next 6 months using @[SALES_TABLE]:

Requirements:
1. Identify trend and seasonality patterns
2. Use appropriate model: ARIMA, Prophet, or exponential smoothing
3. Account for holidays and promotional periods
4. Provide confidence intervals
5. Visualize forecast with historical data overlay
6. Report evaluation metrics (MAE, RMSE)
```

---

### Cohort Analysis

#### Template 13: Retention Cohorts

```
Perform cohort analysis on @[CUSTOMER_TABLE]:

Cohort Definition: First purchase month
Metric: Monthly retention rate (% active each month)

Output:
1. Cohort retention matrix (heatmap visualization)
2. Average retention curve across cohorts
3. Identify best/worst performing cohorts
4. Suggest reasons for differences
```

---

### E-Commerce & Product Analytics

#### Template 14: Funnel Analysis

```
Analyze conversion funnel from @[EVENTS_TABLE]:

Stages:
1. Landing page visit
2. Product page view
3. Add to cart
4. Checkout initiation
5. Purchase completion

Calculate:
- Conversion rate at each stage
- Drop-off percentages
- Time spent in each stage
- Segment by traffic source
```

---

#### Template 15: Market Basket Analysis

```
Perform market basket analysis using @[TRANSACTIONS_TABLE]:

1. Identify frequently purchased product combinations
2. Calculate support, confidence, lift for association rules
3. Minimum support threshold: [e.g., 0.01]
4. Recommend top 10 product bundles for cross-sell
5. Visualize associations as network graph
```

---

#### Template 16: Key Metrics Dashboard

```
Create summary of key e-commerce metrics from @[SALES_TABLE]:

Metrics:
- Revenue (total, by product category)
- AOV (Average Order Value)
- CVR (Conversion Rate)
- CAC (Customer Acquisition Cost)
- LTV (Customer Lifetime Value)
- LTV:CAC ratio

Compare: This month vs last month, YoY growth
```

---

### NLP & Text Analysis

#### Template 17: Sentiment Analysis

```
Analyze sentiment of customer reviews in @[REVIEWS_TABLE]:

1. Use VADER or TextBlob for sentiment scoring
2. Classify as positive, neutral, negative
3. Calculate distribution percentages
4. Identify common themes in negative reviews (keyword extraction)
5. Correlate sentiment with star ratings
6. Suggest actionable insights for product team
```

---

#### Template 18: Topic Modeling

```
Perform topic modeling on @[TEXT_COLUMN] from @[TABLE]:

Method: Latent Dirichlet Allocation (LDA)
Number of topics: [e.g., 5]

Output:
1. Top keywords per topic
2. Topic labels (manually interpret and name)
3. Document-topic distribution
4. Visualize topics with pyLDAvis
```

---

### Visualization

#### Template 19: Chart Recommendations

```
Recommend appropriate visualizations for @[DATAFRAME]:

For each column or relationship:
1. Suggest chart type (bar, line, scatter, heatmap, etc.)
2. Explain why it's appropriate
3. Generate top 3 most insightful charts
4. Use Hex chart cells (not matplotlib)
```

---

#### Template 20: Interactive Dashboard

```
Create an interactive dashboard layout from @[DATAFRAME]:

Components:
1. KPI cards (top-line metrics)
2. Time series chart (trends over time)
3. Category breakdown (bar or pie chart)
4. Distribution histogram (key numeric column)
5. Correlation heatmap (relationships)

Use Hex's chart and single value cells.
```

---

### Notebook Maintenance

#### Template 21: Clean Up Notebook

```
Scan all cells in this notebook and:
1. Flag unused or duplicative cells
2. Map dependency graph (which cells feed into others)
3. Identify orphaned cells safe to delete
4. Suggest reorganization for better flow
```

---

#### Template 22: Generate Documentation

```
Generate markdown documentation for this notebook:

Include:
1. High-level purpose and business question
2. Data sources used
3. Key assumptions
4. Methodology summary
5. Main findings/insights
6. Limitations and caveats

Write for non-technical stakeholders.
```

---

#### Template 23: Create Portable Context

```
Generate a portable context prompt I can paste into a new notebook,
summarizing:
- Data sources and semantic models used
- Key metrics calculated
- Important assumptions
- Business context and goals

This will help the agent in the new notebook understand my analytical approach.
```

---

### Debugging & Optimization

#### Template 24: Debug SQL Query

```
Debug the SQL query in @[CELL_NUMBER]:

Error message: [PASTE ERROR]

Explain:
1. What's causing the error
2. Corrected query
3. Why the fix works
```

---

#### Template 25: Optimize Query Performance

```
Optimize the SQL query in @[CELL_NUMBER] for better performance:

Current runtime: [e.g., 45 seconds]

Suggestions:
1. Indexing recommendations
2. Query rewrite (joins, subqueries)
3. Partition pruning opportunities
4. Avoid full table scans
```

---

## Advanced Techniques

### Specify Exact Methods

Instead of: "Cluster the data"

Use: "Use random forest classifier with scikit-learn to predict churn, identifying top contributing factors"

**Benefit:** Agent knows exact library/technique, reducing ambiguity

---

### Connect to Business Impact

Instead of: "Calculate churn rate"

Use: "Calculate churn rate to determine which channels to increase investment in for Q4 planning"

**Benefit:** Agent understands context, may suggest additional relevant analyses

---

### Iterative Refinement

1. Start broad: "Analyze customer behavior"
2. Review output
3. Refine: "Focus on customers who purchased in Q4, exclude wholesale"

**Benefit:** Faster than trying to perfect prompt upfront

---

## Common Pitfalls

### ❌ Too Vague

"Analyze sales" → Agent unclear on approach

### ✅ Better

"Analyze @sales_table for trends by product category, comparing Q3 to Q4"

---

### ❌ Missing Context

"Create a forecast" → Agent doesn't know what to forecast or time horizon

### ✅ Better

"Forecast monthly revenue for next 6 months using @sales_table, accounting for seasonality"

---

### ❌ No @ Mentions

"Look at the customer table" → Agent searches entire workspace

### ✅ Better

"Analyze @customer_transactions table" → Agent knows exactly what to use

---

## Workspace Rules Files

**Purpose:** Inject organizational standards into every prompt automatically

**Example `.hexrules` file:**

```markdown
# Data Definitions

- Fiscal year starts in July
- Customer churn = no activity in 90 days
- Always use @revenue_semantic_model for revenue calculations
- PII data requires masking (use hash_email() function)

# Coding Standards

- Use parameterized queries (no string concatenation)
- Include LIMIT clause when exploring new tables
- Add comments explaining business logic

# Reporting Standards

- Currency in USD
- Percentages as decimals (0.15 not 15%)
- Dates in YYYY-MM-DD format
```

**Impact:** Agent follows standards without repeating in every prompt

---

## Prompt Chaining Example

### Step 1: Planning

```
Create a plan for analyzing customer lifetime value, considering:
- Purchase frequency
- Average order value
- Customer lifespan
- Acquisition cost

Break into discrete steps.
```

### Step 2: Execution

```
Execute this plan:
[PASTE PLAN FROM STEP 1]

Use @customer_table and @orders_table.
```

### Step 3: Refinement

```
Great! Now segment customers into:
- High LTV (top 20%)
- Medium LTV (middle 60%)
- Low LTV (bottom 20%)

Profile each segment's characteristics.
```

---

## Implementation for Athena

### Adapt for Document Intelligence

| Hex Template           | Athena Adaptation                            |
| ---------------------- | -------------------------------------------- |
| Data discovery         | "Find documents related to [topic]"          |
| Schema exploration     | "List sections/entities in @[document]"      |
| Clustering             | "Group similar documents by content"         |
| Sentiment analysis     | "Analyze sentiment in legal briefs @[doc]"   |
| Topic modeling         | "Extract key themes from @[document_set]"    |
| Create dashboard       | "Summarize insights from multiple documents" |
| Generate documentation | "Explain what this Space contains"           |

### Quick Actions for Athena

Pre-defined buttons with prompts:

- 📝 **Summarize:** "Summarize @[document] in 3 bullet points"
- 🔍 **Extract Entities:** "Extract people, orgs, dates from @[document]"
- 📊 **Key Insights:** "Identify top 5 insights from @[document]"
- 🔗 **Find Related:** "Find documents similar to @[document]"
- ❓ **Answer Question:** Open modal for free-form query

---

## Related Documentation

- [Notebook Agent](../product-architecture/notebook-agent.md) - Feature overview
- [AI Integration Philosophy](./ai-integration-philosophy.md) - Design principles
- [AI Components](../design-system/ai-components.md) - UI patterns

---

**Last Updated:** January 2025
**Source:** https://hex.tech/blog/notebook-agent-prompting-guide-agentic-analytics/

**Key Takeaway:** Structured prompts with context, constraints, and @ mentions produce best results.
