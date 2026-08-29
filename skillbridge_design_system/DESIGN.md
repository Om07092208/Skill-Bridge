---
name: SkillBridge Design System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#464555'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#3130c0'
  on-tertiary: '#ffffff'
  tertiary-container: '#4b4dd8'
  on-tertiary-container: '#d9d8ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#e1e0ff'
  tertiary-fixed-dim: '#c0c1ff'
  on-tertiary-fixed: '#07006c'
  on-tertiary-fixed-variant: '#2f2ebe'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style

The design system is engineered for a high-utility, educational SaaS environment. It balances the technical sophistication of agentic AI with the approachability required for students. The aesthetic is **Corporate Modern**, leaning heavily into functional minimalism to reduce cognitive load during high-stakes interview preparation. 

The brand personality is reliable, encouraging, and precise. By utilizing a "Safe" visual identity, the system leverages familiar SaaS patterns (similar to Linear or Stripe) to ensure students can navigate complex AI feedback loops intuitively. The interface should feel "invisible," allowing the user’s performance data and AI interactions to take center stage.

## Colors

The palette is anchored by a high-contrast **Indigo** (#4F46E5), used strategically for primary actions and brand presence. To support the educational aspect of the platform, **Success Green** (#10B981) is elevated to a secondary brand color, signaling progress, mastery, and positive AI feedback.

The background uses a cool-toned **Slate** (#F8FAFC) to provide a soft canvas that reduces eye strain, while white surfaces (#FFFFFF) define the interactive zones. Neutral tones are strictly derived from the Slate/Blue-Gray family to maintain a cohesive, professional "tech" atmosphere.

## Typography

This design system utilizes **Inter** for all text roles. Inter’s tall x-height and exceptional legibility make it ideal for data-dense interview feedback and real-time AI transcripts.

A clear hierarchy is established through weight and color rather than excessive size. Headlines use a **Bold (700)** or **Semi-Bold (600)** weight with slight negative letter-spacing to appear more compact and modern. Body text defaults to a 16px base for optimal readability. Small labels and metadata should use a slightly heavier weight (Medium 500) to ensure accessibility against light gray backgrounds.

## Layout & Spacing

The layout follows a **12-column fluid grid** for the main content area, with a fixed sidebar navigation for desktop. On mobile, the sidebar collapses into a bottom navigation or "hamburger" menu.

Spacing is built on an **8px (0.5rem) scale**, emphasizing "Generous Whitespace" to prevent the dashboard from feeling overwhelming. 
- **Dashboards:** Use a 24px (1.5rem) gap between grid cards.
- **Section Headers:** 32px (2rem) bottom margin to clearly separate the page title from the content.
- **In-card Padding:** Consistent 24px (1.5rem) padding for all standard surface containers.

## Elevation & Depth

Hierarchy is achieved through a combination of **soft ambient shadows** and **subtle borders**. 

- **Level 0 (Background):** #F8FAFC, flat.
- **Level 1 (Cards/Surfaces):** White background with a 1px border (#E2E8F0) and a very soft, diffused shadow (0 1px 3px 0 rgba(0, 0, 0, 0.1)).
- **Level 2 (Dropdowns/Modals):** Increased elevation with a deeper shadow (0 10px 15px -3px rgba(0, 0, 0, 0.1)) to suggest physical proximity to the user.

Avoid heavy blacks or harsh glows. Shadows should feel like they are cast by natural, top-down lighting.

## Shapes

The design system utilizes a **Rounded (Level 2)** shape language to soften the "corporate" edge and feel more modern. 

- **Base Components:** Buttons and inputs use a **0.5rem (8px)** radius.
- **Large Components:** Cards and main content panels use a **1rem (16px)** radius to create a distinct, friendly container feel.
- **Extra Large:** Specialized items like the AI chat bubble or decorative elements use **1.5rem (24px)** to emphasize their "human-centric" or "agentic" nature.

## Components

### Buttons
- **Primary:** Solid #4F46E5 background with white text. 0.5rem radius. 
- **Secondary:** White background with #E2E8F0 border and #0F172A text.
- **Success:** Solid #10B981 for "Start Interview" or "Complete" actions.

### Input Fields
- Use a white background, #E2E8F0 border, and 16px (1rem) internal padding. 
- Focus state: 2px solid #4F46E5 with a 4px soft indigo outer glow.

### Cards
- Always use the 1rem (16px) corner radius. 
- Headers inside cards should have a subtle bottom border or increased padding (24px) to separate them from the content body.

### AI Feedback Chips
- Small capsules for skill tags (e.g., "Confidence," "Clarity").
- Use light indigo backgrounds with dark indigo text for a "themed" but readable look.

### Iconography
- Use **Lucide** or **Heroicons** with a 2px stroke weight.
- Icons should be consistently sized (20px or 24px) and use #64748B for neutral states.