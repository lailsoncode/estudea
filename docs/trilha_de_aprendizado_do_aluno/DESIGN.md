---
name: Lumina Modern
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#712ae2'
  on-secondary: '#ffffff'
  secondary-container: '#8a4cfc'
  on-secondary-container: '#fffbff'
  tertiary: '#005a82'
  on-tertiary: '#ffffff'
  tertiary-container: '#0074a6'
  on-tertiary-container: '#e4f2ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#eaddff'
  secondary-fixed-dim: '#d2bbff'
  on-secondary-fixed: '#25005a'
  on-secondary-fixed-variant: '#5a00c6'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.75'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.5rem
  sm: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  max-width-content: 1280px
---

## Brand & Style

The design system is engineered for **EduFlow**, a platform that bridges the gap between traditional learning and modern SaaS efficiency. The brand personality is **Intelligent, Optimistic, and Clear**, moving away from legacy instructional design toward a premium, digital-first experience.

The design style is **Modern SaaS with Glassmorphic Accents**. It prioritizes extreme legibility and a sense of "digital air" (whitespace) to reduce cognitive load for learners. It utilizes a layered architecture where depth is communicated through soft shadows and translucent materials rather than heavy lines or textures. The result is a high-contrast, professional environment that feels both sophisticated and approachable.

## Colors

The palette transitions from dated flat colors to a vibrant, multi-dimensional system:

- **Primary (Lumina Blue):** A deep, trustworthy blue (#2563EB) used for primary actions and brand presence.
- **Secondary (Flow Violet):** A sophisticated purple (#7C3AED) used for progress indicators and highlighting "aha!" moments in the learning journey.
- **Neutrals (Slate/Zinc):** A cool-toned neutral scale that ensures high contrast and a "tech-forward" feel. Use `Slate-900` (#0F172A) for primary text to ensure maximum readability.
- **Accents:** Vibrant sky blues and teals are reserved for success states and secondary data visualizations.

Avoid solid black. Use the deep Slate tones for all "dark" elements to maintain a premium, softer visual weight.

## Typography

The system utilizes a dual-font strategy to balance character with utility:

1.  **Plus Jakarta Sans (Headings):** Chosen for its modern, slightly rounded, and optimistic geometric shapes. It provides a distinct personality for the EduFlow brand.
2.  **Inter (Body & UI):** A workhorse for readability. Its tall x-height and neutral character make it perfect for long-form educational content and dense UI controls.

**Hierarchy Rules:**
- Use **Display LG** only for marketing hero sections or major landing pages.
- **Body LG** is the preferred size for educational content (lesson text) to ensure accessibility.
- **Generous Line Height:** Maintain at least 1.6x for body text to promote scanning and reduce eye fatigue during long study sessions.

## Layout & Spacing

This design system employs a **12-column fluid grid** for desktop and a **single-column vertical stack** for mobile. 

- **The 8px Rhythm:** All spacing (padding, margins, gap) must be a multiple of the 4px base unit, though 8px increments are preferred for component-level layout.
- **Container Strategy:** Main content should be housed in a centered container with a max-width of 1280px. 
- **White Space:** Be aggressive with whitespace. Lesson modules should have at least 48px of vertical separation to distinguish between different cognitive tasks.
- **Mobile Adjustments:** Gutters shrink from 24px to 16px, and top/bottom padding on sections reduces by 50% compared to desktop.

## Elevation & Depth

To replace the dated "Web 2.0" aesthetic, we use a system of **Tonal Layers** and **Glassmorphism**:

1.  **Level 0 (Canvas):** The base background (#F8FAFC).
2.  **Level 1 (Cards):** Pure white surfaces with a very soft, multi-layered shadow (e.g., `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`).
3.  **Level 2 (Modals/Popovers):** Higher elevation with a 15% backdrop blur (12px) and a thin 1px translucent border (`rgba(255,255,255,0.4)`).
4.  **Glassmorphism:** Use for floating navigation bars or sidebars. Apply a `backdrop-filter: blur(20px)` and a background color of `rgba(255, 255, 255, 0.75)`.

Avoid hard black borders. Use depth to suggest clickability rather than high-contrast outlines.

## Shapes

The design system moves away from sharp corners to embrace a **Rounded** aesthetic (8px - 16px).

- **Standard Components:** Buttons, inputs, and small chips use **0.5rem (8px)**.
- **Containers:** Dashboard cards, lesson modules, and main content blocks use **1rem (16px)** to create a soft, friendly frame for content.
- **Interactive Feedback:** On hover, elements do not change shape, but their "glow" (shadow spread) may increase slightly to suggest elevation.

## Components

### Buttons
- **Primary:** Use a subtle linear gradient (Primary Blue to a slightly darker shade). No gloss. 12px vertical padding, 24px horizontal.
- **Ghost/Tertiary:** Use a subtle background fill on hover (`Slate-50`) rather than an outline.

### Input Fields
- Avoid thin outlines. Use a light background fill (`Slate-100`) with a 1px border that darkens on focus. This makes the input feel "integrated" into the page.
- Focus state: A 3px soft outer glow in the Primary Blue color at 20% opacity.

### Cards
- Cards are the primary vessel for information. They should feature 24px internal padding and 16px corner radii.
- Hover state: Shift the card 4px upward and deepen the shadow to create a "lifting" effect.

### Chips & Tags
- Use for course categories or status (e.g., "In Progress").
- Soft, desaturated background colors with high-contrast text (e.g., Light Blue background with Dark Blue text).

### Progress Bars
- High-contrast Flow Violet for the fill. The "track" should be a very light neutral with a subtle inner shadow to look recessed.