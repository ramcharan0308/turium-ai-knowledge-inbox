# Design System Master Specification: Turium AI Knowledge Inbox
## Direction: Cocoa × Eucalyptus (Dark-First Premium Editorial)

### 1. Product Identity & Philosophy

**Product Name:** Turium AI Knowledge Inbox
**Role:** Minimal, production-grade knowledge management desk for ingesting notes & URLs and performing grounded, citation-backed semantic retrieval.
**Core Motto:** *Clarity over beauty · Zero-hallucination RAG*
**Aesthetic Personality:** Sophisticated Dark Editorial / Swiss Monospace Studio (Linear, Raycast, Attio, ReadCV).
**Explicit Anti-Patterns:**
- No generic purple/indigo AI glows or pulsing neon gradients.
- No harsh pure-black backgrounds (`#000000`); strictly warm cocoa-gray charcoal (`#191B19`).
- No heavy WebGL shaders or performance-degrading canvas animations.
- No glassmorphic blur stacks that hinder text legibility.
- No unstyled white components or mismatched light surfaces.

---

### 2. Design Tokens: Cocoa × Eucalyptus

#### Core Color Palette

| Token Name | Hex Value | Role / Purpose |
| :--- | :--- | :--- |
| `--color-canvas` | `#191B19` | Main application background (warm cocoa-charcoal) |
| `--color-surface` | `#292D29` | Primary surfaces (cards, query desk, capture desk) |
| `--color-surface-subtle` | `#202420` | Secondary surfaces (toolbars, inner containers, code blocks) |
| `--color-surface-elevated`| `#343A34` | Elevated surfaces (modals, dropdowns, floating toasts, active tabs) |
| `--color-border` | `#485148` | Crisp structural 1px borders |
| `--color-border-hover` | `#5C665C` | Interactive hover borders |
| `--color-border-subtle` | `#333933` | Divider lines and sub-borders |
| `--color-text-primary` | `#F1F0EA` | Primary high-contrast warm ivory text (WCAG AAA on dark) |
| `--color-text-secondary` | `#B8C0B6` | Secondary muted eucalyptus-sage text |
| `--color-text-muted` | `#849082` | Micro-copy, metadata, labels |
| `--color-accent` | `#A8C8B5` | Primary eucalyptus-green accent |
| `--color-accent-hover` | `#C0DACB` | Accent hover state |
| `--color-accent-subtle` | `#252E27` | Subtle eucalyptus tint for active badges and pills |
| `--color-cocoa` | `#D4A373` | Warm cocoa tint for notes |
| `--color-cocoa-subtle` | `#2D2319` | Subtle cocoa background for note badges |
| `--color-success` | `#4ADE80` | Validated URLs, ready indexing status (emerald) |
| `--color-success-subtle` | `#1C2E22` | Emerald container background |
| `--color-warning` | `#FBBF24` | Pending indexing status, truncation warnings (amber) |
| `--color-warning-subtle` | `#332814` | Amber container background |
| `--color-destructive` | `#FB7185` | Ingestion errors, SSRF blocks (rose) |
| `--color-destructive-subtle`| `#33181D`| Rose container background |
| `--color-ring` | `#A8C8B5` | Accessible keyboard focus ring |

#### Typography Scale

- **Primary UI & Headings:** Modern clean sans (`system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Plus Jakarta Sans`, `sans-serif`)
- **Technical Metadata & Code:** Geometric monospace (`ui-monospace`, `SFMono-Regular`, `Menlo`, `Consolas`, monospace) for chunk IDs, source tags `[S1]`, scores, timestamps, and model names.

| Level | Size / Line Height | Weight | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **H1** | 24px / 32px (`1.5rem`) | SemiBold (600) | `-0.02em` | Main headings |
| **H2** | 16px / 24px (`1rem`) | SemiBold (600) | `-0.01em` | Section headers (Capture, Library, Query) |
| **H3** | 14px / 20px (`0.875rem`) | Medium (500) | `0` | Item card title, answer title |
| **Body** | 14px / 22px (`0.875rem`) | Regular (400) | `0` | Notes, answers, inputs |
| **Caption** | 12px / 16px (`0.75rem`) | Regular (400) | `0` | Field labels, helper text |
| **Mono Meta** | 11px / 14px (`0.6875rem`) | Medium (500) | `0.02em` | Chunk IDs, scores, timestamps, badges |

### Spacing Scale

- Base grid: `4px`
- Micro gaps: `4px` (`gap-1`), `8px` (`gap-2`)
- Input / Card internal padding: `12px` (`p-3`), `16px` (`p-4`), `24px` (`p-6`)
- Section margins: `32px` (`my-8`), `40px` (`my-10`)

---

## 4. Surface Hierarchy & Component Principles

```
+------------------------------------------------------------------------+
| TOP NAV (h-16): Logo | Knowledge Inbox Badge | Status Indicator (Pill) |
+------------------------------------+-----------------------------------+
| LEFT RAIL: Ingestion & Saved Items | RIGHT RAIL: Grounded Query Desk   |
| - Tabs: Plain Note | URL Ingestion | - Natural Language Query Input    |
| - Ingest Form (Title, URL, Content)| - Grounded Answer Card            |
| - Primary Action: "Save to Inbox"  | - Inline Citation References [1]  |
| - Saved Items Stack (Chronological)| - Expandable Source Snippet Drawer|
|   * Note Badge / URL Domain Tag    |   * Chunk Index, Cosine Score     |
|   * Extracted Text Snippet         |                                   |
|   * Chunk Count (e.g. 4 chunks)    |                                   |
+------------------------------------+-----------------------------------+
```

### Component Principles

1. **Tabs (Note vs URL):**
   - Segmented pill design with high-contrast active state.
2. **Knowledge Cards:**
   - 1px crisp border with subtle hover transition (`border-slate-300`, `shadow-xs`).
   - Monospace type badge for `NOTE` vs `URL`.
   - Clear timestamp and chunk count.
3. **Citations & Grounded Answers:**
   - Citations presented as interactive badges (`[Source: Article Title #2]`).
   - Clicking a citation opens a drawer/modal displaying the exact retrieved chunk and cosine similarity score.
4. **Empty & Error States:**
   - Clear instructional prompts when inbox has 0 items.
   - Descriptive human-readable error messages for SSRF blocks or network timeouts.

---

## 5. Motion & Accessibility

- **Motion Duration:** $150\text{ms} - 200\text{ms}$ with `ease-out`.
- **Transitions:** Layout opacity fade-in, collapsible citation accordions.
- **Reduced Motion:** If `prefers-reduced-motion: reduce` is detected, animations are replaced with instant visibility shifts (`opacity: 1`, `duration: 0`).
- **Keyboard Navigation:** Every actionable element has `focus-visible:ring-2 focus-visible:ring-teal-500`.
- **Screen Reader Support:** Meaningful ARIA labels on icon buttons and status pills.
