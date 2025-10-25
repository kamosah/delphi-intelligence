# Hex Design System - Typography

> **Source:** Extracted from https://hex.tech homepage and product pages
> **Philosophy:** Modern, technical, highly readable with monospace for code

## Overview

Hex's typography system combines contemporary display fonts (PP Formula) with clean body fonts (Cinetype) and technical monospace typefaces (IBM Plex Mono). The system prioritizes readability for both marketing content and code-heavy interfaces.

---

## Font Families

### Display Font: PP Formula

**Primary Usage:** Headlines, feature titles, large UI text

| Variant          | Font                    | Weight     | Usage                      |
| ---------------- | ----------------------- | ---------- | -------------------------- |
| **SemiExtended** | PP Formula SemiExtended | 700 (Bold) | Hero headings, page titles |
| **Standard**     | PP Formula              | 300-800    | Subheadings, button labels |

**Characteristics:**

- Modern, geometric sans-serif
- Excellent readability at large sizes
- Slightly extended letterforms provide impact
- Wide weight range (300-800) for hierarchy

**Web Font Loading:**

```css
@font-face {
  font-family: 'PP Formula SemiExtended';
  src: url('/fonts/PPFormulaSemiExtended-Bold.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}

@font-face {
  font-family: 'PP Formula';
  src: url('/fonts/PPFormula-Light.woff2') format('woff2');
  font-weight: 300;
  font-display: swap;
}
```

---

### Body Font: Cinetype

**Primary Usage:** Body text, descriptions, UI labels

| Weight            | Usage                                 |
| ----------------- | ------------------------------------- |
| **300 (Light)**   | Large body text, feature descriptions |
| **400 (Regular)** | Standard body text, paragraphs        |
| **500 (Medium)**  | Emphasis within body text             |
| **700 (Bold)**    | Strong emphasis, labels               |

**Characteristics:**

- Clean, neutral sans-serif
- Optimized for screen reading
- Wide weight range for flexible hierarchy
- Excellent legibility at small sizes

**Alternative Font Stack:**

```css
font-family:
  Cinetype,
  PP Formula,
  -apple-system,
  BlinkMacSystemFont,
  'Segoe UI',
  sans-serif;
```

---

### Monospace Font: IBM Plex Mono

**Primary Usage:** Code blocks, SQL queries, technical annotations, file paths

| Weight             | Usage                          |
| ------------------ | ------------------------------ |
| **400 (Regular)**  | Inline code, code blocks       |
| **500 (Medium)**   | Highlighted code, active cells |
| **600 (SemiBold)** | Code headings, syntax errors   |

**Characteristics:**

- Designed specifically for code display
- Clear distinction between similar characters (0/O, 1/l/I)
- Comfortable for extended reading
- Wide language support (Latin, Cyrillic, Greek)

**Alternative for Annotations:**

- **Cinetype Mono** - Used in some UI contexts where lighter monospace is needed

**Web Font Loading:**

```css
@font-face {
  font-family: 'IBM Plex Mono';
  src: url('/fonts/IBMPlexMono-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```

---

## Type Scale

### Desktop Scale

| Level           | Size | Line Height | Weight | Font Family             | Usage                |
| --------------- | ---- | ----------- | ------ | ----------------------- | -------------------- |
| **Display**     | 60px | 1.1 (66px)  | 700    | PP Formula SemiExtended | Hero headings        |
| **H1**          | 48px | 1.2 (58px)  | 700    | PP Formula              | Page titles          |
| **H2**          | 36px | 1.3 (47px)  | 700    | PP Formula              | Section headings     |
| **H3**          | 28px | 1.4 (39px)  | 600    | PP Formula              | Subsection headings  |
| **H4**          | 24px | 1.4 (34px)  | 600    | PP Formula              | Card titles          |
| **H5**          | 20px | 1.5 (30px)  | 600    | PP Formula              | Small headings       |
| **Body Large**  | 18px | 1.6 (29px)  | 400    | Cinetype                | Feature descriptions |
| **Body**        | 16px | 1.6 (26px)  | 400    | Cinetype                | Standard text        |
| **Body Small**  | 14px | 1.5 (21px)  | 400    | Cinetype                | Labels, captions     |
| **Caption**     | 12px | 1.4 (17px)  | 400    | Cinetype                | Metadata, timestamps |
| **Code**        | 14px | 1.6 (22px)  | 400    | IBM Plex Mono           | Code blocks          |
| **Code Inline** | 13px | inherit     | 500    | IBM Plex Mono           | Inline code snippets |

### Mobile Scale (Responsive)

Hex uses `clamp()` for fluid typography:

```css
/* Example: Hero heading scales from 32px (mobile) to 60px (desktop) */
font-size: clamp(32px, 5vw, 60px);
```

**Scaling Strategy:**

- Display: 32px → 60px
- H1: 28px → 48px
- H2: 24px → 36px
- H3: 20px → 28px
- Body: 15px → 16px (minimal scaling)

---

## Text Styles & Effects

### Gradient Text

Hex extensively uses gradient text for hero headings:

```css
.gradient-text {
  background: linear-gradient(
    55deg,
    #ffffff 20%,
    rgba(245, 192, 192, 0.8) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

**Usage:**

- Hero headings: "Make everyone a data person"
- Feature highlights
- Call-to-action emphasis

---

### Text Shadows & Depth

Hex uses subtle text shadows for depth on dark backgrounds:

```css
.heading-shadow {
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
```

---

## UI-Specific Typography

### Buttons

```css
.button-text {
  font-family:
    PP Formula,
    sans-serif;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.025em; /* Slight tracking for emphasis */
  text-transform: none; /* Sentence case, not uppercase */
}
```

### Form Inputs

```css
.input-text {
  font-family: Cinetype, sans-serif;
  font-size: 16px; /* Prevents zoom on iOS */
  font-weight: 400;
  line-height: 1.5;
}

.input-placeholder {
  font-family: Cinetype, sans-serif;
  font-size: 16px;
  font-weight: 400;
  color: #786065; /* Gray 700 */
}
```

### Navigation

```css
.nav-link {
  font-family:
    PP Formula,
    sans-serif;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.01em;
}
```

---

## AI Component Typography

### Agent Responses

```css
.agent-response-text {
  font-family: Cinetype, sans-serif;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.6;
  color: #ffffff;
}

.agent-code-block {
  font-family:
    IBM Plex Mono,
    monospace;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.6;
  background: #0f0f15;
  padding: 16px;
  border-radius: 8px;
}
```

### @ Mentions

```css
.mention-chip {
  font-family:
    IBM Plex Mono,
    monospace;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
  background: rgba(164, 119, 178, 0.2); /* Amethyst with opacity */
  color: #ffffff;
  padding: 2px 8px;
  border-radius: 4px;
}
```

### Diff View

```css
.diff-addition {
  font-family:
    IBM Plex Mono,
    monospace;
  font-size: 14px;
  font-weight: 400;
  background: rgba(92, 177, 152, 0.15); /* Jade with opacity */
  color: #5cb198;
}

.diff-deletion {
  font-family:
    IBM Plex Mono,
    monospace;
  font-size: 14px;
  font-weight: 400;
  background: rgba(255, 100, 100, 0.15); /* Red with opacity */
  color: #ff6464;
  text-decoration: line-through;
}
```

---

## Accessibility Considerations

### Font Sizes

- **Minimum body text:** 16px (meets WCAG AA for readability)
- **Minimum UI text:** 14px (acceptable for labels, captions)
- **Code text:** 14px (monospace appears larger than sans-serif)

### Line Heights

- **Body text:** 1.6 (optimal for reading comfort)
- **Headings:** 1.1-1.4 (tighter for visual impact)
- **Code:** 1.6 (matches body for consistency)

### Font Weights

- **Minimum weight:** 400 (regular) for body text
- **Light weights (300)** only used at larger sizes (18px+)
- **Bold weights (600-700)** provide sufficient contrast for hierarchy

### Contrast

- White text (#FFFFFF) on dark backgrounds exceeds WCAG AAA
- Colored text (rose-quartz, jade) meets WCAG AA on dark backgrounds

---

## Implementation for Athena

### Alternative Font Recommendations

Since PP Formula and Cinetype are commercial fonts, consider these open-source alternatives:

| Hex Font          | Alternative           | Source                |
| ----------------- | --------------------- | --------------------- |
| **PP Formula**    | Inter, Geist, DM Sans | Google Fonts / Vercel |
| **Cinetype**      | Inter, System UI      | Google Fonts / Native |
| **IBM Plex Mono** | IBM Plex Mono ✅      | Google Fonts (same!)  |

**Recommended Stack for Athena:**

```css
:root {
  --font-display:
    'Geist', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-body:
    'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'IBM Plex Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
}
```

### Tailwind CSS Configuration

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        display: ['Geist', 'Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      fontSize: {
        display: ['60px', { lineHeight: '1.1', fontWeight: '700' }],
        h1: ['48px', { lineHeight: '1.2', fontWeight: '700' }],
        h2: ['36px', { lineHeight: '1.3', fontWeight: '700' }],
        h3: ['28px', { lineHeight: '1.4', fontWeight: '600' }],
        h4: ['24px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        body: ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        code: ['14px', { lineHeight: '1.6', fontWeight: '400' }],
      },
    },
  },
};
```

---

## Related Documentation

- [Colors](./colors.md) - Color palette and usage
- [Components](./components.md) - UI component patterns
- [AI Components](./ai-components.md) - AI-specific UI patterns
- [Design Tokens](./tokens.json) - Complete token export

---

**Last Updated:** January 2025
**Source:** https://hex.tech (homepage and product pages)
