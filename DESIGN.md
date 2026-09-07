# DESIGN.md — QuizCraft AI Design System

This design system drives the **QuizCraft AI** application, matching the Google Stitch UI/UX design specifications.

---

## 1. Design Ethos & Aesthetics

- **Tactile Modernism & Atmospheric Clarity**: Interactive items feature crisp borders, subtle elevation states, and instant visual feedback. Layouts prioritize cognitive ease, legible spacing, and micro-animations over distracting heavy shadows.
- **Multilingual Support**: Harmony between English geometric typography (`Outfit` and `Inter`) and Bengali script (`Hind Siliguri`).

---

## 2. Color Tokens

### Primary Palette (Deep Teal Focus)
| Token | Hex / Value | Description |
| :--- | :--- | :--- |
| `primary` | `#00685f` | Main brand accent, primary CTA buttons, active states |
| `primary-container` | `#008378` | Deep primary card container backgrounds |
| `primary-fixed` | `#89f5e7` | Light teal highlights, chips, pill texts |
| `on-primary` | `#ffffff` | Foreground text on primary background |
| `on-primary-container` | `#f4fffc` | Text on primary container |
| `inverse-primary` | `#6bd8cb` | Dark mode primary accent |

### Secondary & Tertiary (Gamification & Feedback)
| Token | Hex / Value | Description |
| :--- | :--- | :--- |
| `secondary` | `#855300` | Warm Amber secondary accent |
| `secondary-container` | `#fea619` | Gamification cards, badges, highlights |
| `tertiary` | `#006947` | Emerald Green success indicators & accuracy gains |
| `tertiary-container` | `#00855b` | Correct answer surfaces & positive stats |
| `error` | `#ba1a1a` | Destructive actions, incorrect answer states |
| `error-container` | `#ffdad6` | Warning & error background fills |

### Surfaces & Backgrounds
| Token | Hex / Value | Description |
| :--- | :--- | :--- |
| `background` | `#f8f9ff` | Application background (light mode) |
| `surface` | `#f8f9ff` | Base surface level |
| `surface-container-lowest` | `#ffffff` | Pure white cards & dialog inputs |
| `surface-container-low` | `#eff4ff` | Very soft tinted containers |
| `surface-container` | `#e5eeff` | Default card & element container fill |
| `surface-container-high` | `#dce9ff` | Elevated border rings & secondary fills |
| `surface-container-highest` | `#d3e4fe` | Unfilled progress tracks, muted chips |
| `on-surface` | `#0b1c30` | Deep slate primary body text |
| `on-surface-variant` | `#3d4947` | Medium contrast secondary body text |
| `outline` | `#6d7a77` | Standard element border rings |
| `outline-variant` | `#bcc9c6` | Subdued borders & dividers |

---

## 3. Typography

- **Headlines & Displays**: `Outfit`, `sans-serif`
  - `font-headline font-bold text-2xl tracking-tight` for major section headers
  - `font-headline font-semibold text-lg` for card titles
- **Body Text**: `Inter`, `Hind Siliguri`, `sans-serif`
  - `text-sm text-on-surface-variant` for descriptive paragraphs
  - `text-xs text-outline` for metadata and timestamps
- **Labels & Badges**: `Outfit`, `sans-serif`
  - `font-headline font-medium text-xs uppercase tracking-wider` for category headers

---

## 4. Screen Mapping Matrix

| Stitch Screen Title | Target Component | File Location |
| :--- | :--- | :--- |
| **Mobile Home Dashboard** | `HomeDashboard.jsx` & `Header.jsx` & `Navigation.jsx` | `src/components/HomeDashboard.jsx` |
| **Create Quiz Wizard — Difficulty** | `QuizWizard.jsx` & `PromptBuilder.jsx` | `src/components/QuizWizard.jsx` |
| **Exam Portal — In-Progress** | `ExamPortal.jsx` | `src/components/ExamPortal.jsx` |
| **Result & Performance Dashboard** | `ResultPortal.jsx` | `src/components/ResultPortal.jsx` |
| **Question Review & AI Analysis** | `ResultPortal.jsx` (Review Tab) | `src/components/ResultPortal.jsx` |
| **Quiz History & Archives** | `ProgressDashboard.jsx` & `HistoryPortal.jsx` | `src/components/ProgressDashboard.jsx` |

---

## 5. UI Component Guidelines

- **Cards**: `rounded-2xl bg-surface-container-lowest border border-surface-container/80 p-4 shadow-sm`
- **Buttons**:
  - **Primary**: `bg-primary text-on-primary font-headline font-semibold rounded-xl px-4 py-2.5 shadow-sm active:scale-95 transition-all`
  - **Secondary**: `border border-surface-container-high bg-surface-container-lowest text-on-surface font-headline font-medium rounded-xl px-4 py-2 hover:bg-surface-container active:scale-95 transition-all`
- **Bottom Navigation**: Fixed shell `fixed bottom-0 w-full z-40 bg-surface/95 backdrop-blur-xl border-t border-surface-container/60 h-16`
- **Option Cards**: Radio-group items with `border-2 border-primary bg-surface-container-lowest` when selected, with check icon indicator.
