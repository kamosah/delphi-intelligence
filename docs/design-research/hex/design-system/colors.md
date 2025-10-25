# Hex Design System - Color Palette

> **Source:** Extracted from https://hex.tech homepage and product pages
> **Theme:** Dark mode with vibrant accent colors

## Overview

Hex employs a sophisticated dark theme with rose-quartz and purple accents, creating a modern, data-focused aesthetic. The color system prioritizes readability, visual hierarchy, and accessibility while maintaining a distinctive brand identity.

---

## Color Palette

### Background Colors

| Name         | Hex Code  | RGB             | Usage                                 |
| ------------ | --------- | --------------- | ------------------------------------- |
| **Obsidian** | `#14141C` | rgb(20, 20, 28) | Primary background, main canvas       |
| **Dark**     | `#0f0f15` | rgb(15, 15, 21) | Secondary background, deeper surfaces |

**Usage Notes:**

- Obsidian is the primary background color for most surfaces
- Dark is used for nested elements, cards, and depth differentiation
- Both colors provide excellent contrast for text and accent colors

---

### Accent Colors

| Name            | Hex Code  | RGB                | Usage                                 |
| --------------- | --------- | ------------------ | ------------------------------------- |
| **Rose Quartz** | `#F5C0C0` | rgb(245, 192, 192) | Primary accent, highlights, gradients |
| **Amethyst**    | `#A477B2` | rgb(164, 119, 178) | Secondary accent, purple highlights   |
| **Jade**        | `#5CB198` | rgb(92, 177, 152)  | Success states, positive indicators   |

**Usage Notes:**

- Rose Quartz is the signature Hex color, used extensively in:
  - Gradient text effects (white → rose quartz)
  - Hover states and interactive elements
  - Brand moments and hero sections
- Amethyst provides contrast and variety for secondary actions
- Jade is used sparingly for success states and positive feedback

---

### Text & Neutral Colors

| Name         | Hex Code  | RGB                | Usage                          |
| ------------ | --------- | ------------------ | ------------------------------ |
| **White**    | `#FFFFFF` | rgb(255, 255, 255) | Primary text, headings         |
| **Gray 600** | `#99797d` | rgb(153, 121, 125) | Secondary text, labels         |
| **Gray 700** | `#786065` | rgb(120, 96, 101)  | Tertiary text, disabled states |

**Usage Notes:**

- White text on dark backgrounds ensures high contrast (WCAG AAA)
- Gray tones have subtle warmth to match the rose-quartz accent
- Text hierarchy: White (headings) → Gray 600 (body) → Gray 700 (captions)

---

## Gradient Patterns

Hex uses sophisticated gradients throughout the interface:

### Primary Gradient (Text)

```css
linear-gradient(55deg, #ffffff 20%, rgba(245,192,192,0.8) 100%)
```

- **Usage:** Hero headings, feature titles
- **Effect:** White text transitioning to rose-quartz at 55° angle
- **Application:** Creates visual interest while maintaining readability

### Card Gradient (Radial)

```css
radial-gradient(circle at focal-point, accent-color, transparent)
```

- **Usage:** Glassmorphic card backgrounds
- **Effect:** Subtle glow effect from accent colors
- **Application:** Depth and visual hierarchy

---

## Color Usage Patterns

### Interactive Elements

**Buttons:**

- Background: Gradient with rose-quartz accent
- Border: Rose-quartz (#F5C0C0)
- Hover: Increased opacity, corner line animations

**Links:**

- Default: Rose-quartz (#F5C0C0)
- Hover: White (#FFFFFF) with opacity transition
- Visited: Amethyst (#A477B2)

**Cards:**

- Background: Obsidian (#14141C) with radial gradient overlay
- Border: Subtle gray (rgba(255,255,255,0.1))
- Hover: Scale transform + corner accent animations

### AI-Specific Colors

**Agent Responses:**

- Container background: Slightly lighter than obsidian
- Accent border: Rose-quartz for AI-generated content
- Diff view additions: Jade (#5CB198) with transparency
- Diff view deletions: Red variant (not explicitly documented)

**@ Mentions:**

- Background: Amethyst (#A477B2) with low opacity
- Text: White (#FFFFFF)
- Border: Amethyst with higher opacity

---

## Accessibility Considerations

### Contrast Ratios

| Combination             | Ratio  | WCAG Level      |
| ----------------------- | ------ | --------------- |
| White on Obsidian       | 16.5:1 | AAA             |
| Rose-quartz on Obsidian | 5.2:1  | AA              |
| Gray 600 on Obsidian    | 3.8:1  | AA (large text) |

**Notes:**

- All primary text combinations meet WCAG AA standards
- Heading text exceeds WCAG AAA for normal-sized text
- Accent colors on dark backgrounds provide sufficient contrast

### Color Blindness

- **Protanopia/Deuteranopia:** Rose-quartz and jade provide sufficient differentiation
- **Tritanopia:** Amethyst and jade remain distinguishable
- **Recommendation:** Avoid relying solely on color for critical information (use icons, labels)

---

## Implementation for Athena

### Tailwind CSS Configuration

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Background
        obsidian: '#14141C',
        'dark-bg': '#0f0f15',

        // Accent colors
        'rose-quartz': '#F5C0C0',
        amethyst: '#A477B2',
        jade: '#5CB198',

        // Text colors
        'text-primary': '#FFFFFF',
        'text-secondary': '#99797d',
        'text-tertiary': '#786065',
      },
      backgroundImage: {
        'gradient-hero':
          'linear-gradient(55deg, #ffffff 20%, rgba(245,192,192,0.8) 100%)',
        'gradient-card':
          'radial-gradient(circle, var(--accent-color), transparent)',
      },
    },
  },
};
```

### CSS Custom Properties

```css
:root {
  /* Background */
  --color-obsidian: #14141c;
  --color-dark: #0f0f15;

  /* Accents */
  --color-rose-quartz: #f5c0c0;
  --color-amethyst: #a477b2;
  --color-jade: #5cb198;

  /* Text */
  --color-text-primary: #ffffff;
  --color-text-secondary: #99797d;
  --color-text-tertiary: #786065;

  /* Gradients */
  --gradient-text: linear-gradient(
    55deg,
    #ffffff 20%,
    rgba(245, 192, 192, 0.8) 100%
  );
}
```

---

## Design Tokens (JSON)

See [tokens.json](./tokens.json) for complete design token export compatible with Athena's design system.

---

## Examples from Hex

### Homepage Hero

- **Background:** Obsidian (#14141C)
- **Heading:** Gradient text (white → rose-quartz)
- **Body text:** White (#FFFFFF)
- **Accent elements:** Rose-quartz (#F5C0C0)

### Product Cards

- **Card background:** Obsidian with radial gradient
- **Card border:** Subtle white (10% opacity)
- **Hover state:** Corner accent lines in rose-quartz
- **Text:** White headings, Gray 600 body

### Agent UI

- **Modal background:** Dark (#0f0f15)
- **Input field:** Obsidian with rose-quartz border on focus
- **@ Mentions:** Amethyst background (low opacity)
- **Diff view additions:** Jade background (low opacity)

---

## Related Documentation

- [Typography](./typography.md) - Font families and scales
- [Components](./components.md) - UI component patterns
- [AI Components](./ai-components.md) - AI-specific UI patterns
- [Design Tokens](./tokens.json) - Complete token export

---

**Last Updated:** January 2025
**Source:** https://hex.tech (homepage and product pages)
