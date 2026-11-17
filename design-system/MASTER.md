# Design System Master Specification: Turium AI Knowledge Inbox

## 1. Product Identity & Philosophy

**Product Name:** Turium AI Knowledge Inbox  
**Role:** Minimal, production-grade knowledge management desk for ingesting notes & URLs and performing grounded, citation-backed semantic retrieval.  
**Core Motto:** *Clarity over beauty · Zero-hallucination RAG*  
**Aesthetic Personality:** Modern Editorial / Swiss Monospace Studio (Attio, Craft, ReadCV, Linear).  
**Explicit Anti-Patterns:**
- No generic purple/indigo AI glows or pulsing neon gradients.
- No heavy WebGL shaders or performance-degrading canvas animations (e.g. Vanta.js).
- No glassmorphic blur stacks that hinder text legibility.
- No emojis used as UI icons (strictly SVG iconography via Lucide).

---

## 2. Research Findings from UI/UX Pro Max

1. **Information Architecture (Product Demo + Features Pattern):**
   - Clear distinction between Ingestion (Input Rail) and Querying (Retrieval Desk).
   - Expandable knowledge cards with source metadata.
   - Grounded Q&A with transparent citations and similarity match scores.
2. **Form & Input UX Guidelines:**
   - Explicit visible labels above inputs (never rely solely on placeholders).
   - Strict input types (`type="url"` with clear error states, `type="text"`).
   - Instant visual feedback on ingestion and retrieval states.
3. **Accessibility Baseline:**
   - 4.5:1 minimum contrast ratio for body copy.
   - Distinct, visible focus rings for full keyboard navigation (`--color-ring`).
   - Strict compliance with `prefers-reduced-motion`.

---

## 3. Design Tokens

### Color Tokens

| Token Name | Hex Value | Role / Purpose |
| :--- | :--- | :--- |
| `--color-canvas` | `#F8FAFC` | Primary light canvas background (slate-50) |
| `--color-canvas-dark` | `#0D1117` | Dark mode canvas background |
| `--color-surface` | `#FFFFFF` | Card & input container background |
| `--color-surface-subtle` | `#F1F5F9` | Secondary background / table headers (slate-100) |
| `--color-border` | `#E2E8F0` | Subtle structural 1px border (slate-200) |
| `--color-border-hover` | `#CBD5E1` | Card hover border (slate-300) |
| `--color-text-primary` | `#0F172A` | High-contrast readable body text (slate-900) |
| `--color-text-secondary` | `#475569` | Secondary descriptions, timestamps (slate-600) |
| `--color-text-muted` | `#94A3B8` | Micro-copy, metadata badges (slate-400) |
| `--color-primary` | `#0D9488` | Active brand teal (teal-600) |
| `--color-primary-hover` | `#0F766E` | Button hover (teal-700) |
| `--color-accent` | `#EA580C` | Action highlight / CTA (orange-600) |
| `--color-success` | `#059669` | Validated URLs, ready status (emerald-600) |
| `--color-warning` | `#D97706` | Truncation, mock fallback indicator (amber-600) |
| `--color-destructive` | `#DC2626` | SSRF violations, extraction errors (red-600) |
| `--color-ring` | `#0D9488` | Keyboard focus ring |

### Typography Scale

- **Primary UI & Headings:** `Plus Jakarta Sans`, system-ui, -apple-system, sans-serif
- **Technical Metadata & Code:** `JetBrains Mono`, monospace (used for URLs, chunk numbers, scores, timestamps)

| Level | Size / Line Height | Weight | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **H1** | 24px / 32px (`1.5rem`) | SemiBold (600) | `-0.02em` | Workspace header |
| **H2** | 18px / 26px (`1.125rem`) | SemiBold (600) | `-0.01em` | Section headers (Ingest, Query) |
| **H3** | 14px / 20px (`0.875rem`) | Medium (500) | `0` | Knowledge card title |
| **Body** | 14px / 22px (`0.875rem`) | Regular (400) | `0` | Notes, answers, inputs |
| **Caption** | 12px / 16px (`0.75rem`) | Regular (400) | `0` | Field labels, helper text |
| **Mono Meta** | 11px / 14px (`0.6875rem`) | Medium (500) | `0.02em` | Chunk IDs, scores, timestamps |

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
