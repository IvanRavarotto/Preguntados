---
name: Obsidian Lumina
colors:
  surface: '#121319'
  surface-dim: '#121319'
  surface-bright: '#383940'
  surface-container-lowest: '#0d0e14'
  surface-container-low: '#1a1b22'
  surface-container: '#1e1f26'
  surface-container-high: '#292930'
  surface-container-highest: '#34343b'
  on-surface: '#e3e1eb'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e3e1eb'
  inverse-on-surface: '#2f3037'
  outline: '#849495'
  outline-variant: '#3b494b'
  surface-tint: '#00dbe9'
  primary: '#dbfcff'
  on-primary: '#00363a'
  primary-container: '#00f0ff'
  on-primary-container: '#006970'
  inverse-primary: '#006970'
  secondary: '#ecb2ff'
  on-secondary: '#520071'
  secondary-container: '#cf5cff'
  on-secondary-container: '#480063'
  tertiary: '#d9ffe3'
  on-tertiary: '#003920'
  tertiary-container: '#00f89c'
  on-tertiary-container: '#006d42'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#7df4ff'
  primary-fixed-dim: '#00dbe9'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#f8d8ff'
  secondary-fixed-dim: '#ecb2ff'
  on-secondary-fixed: '#320047'
  on-secondary-fixed-variant: '#74009f'
  tertiary-fixed: '#54ffaa'
  tertiary-fixed-dim: '#00e38e'
  on-tertiary-fixed: '#002110'
  on-tertiary-fixed-variant: '#005230'
  background: '#121319'
  on-background: '#e3e1eb'
  surface-variant: '#34343b'
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Outfit
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Outfit
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Outfit
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Outfit
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Outfit
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Space Mono
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.08em
  label-sm:
    fontFamily: Space Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.5rem
  gutter-desktop: 2rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: auto
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system establishes a high-octane, cerebral atmosphere tailored for modern trivia competitors. It rejects the cartoonish, overly gamified tropes of legacy trivia applications—deliberately eliminating crowns, badges, and noisy mascot flourishes—in favor of a sleek, arcade-meets-fintech aesthetic. The emotional cadence is intense, focused, and rewarding: players feel as though they are interacting with a luminous cybernetic console where knowledge is precise, fast, and electric.

The visual direction merges **Minimalist Glassmorphism** with **High-Contrast Neon Accents**. Dark void surfaces allow hyper-saturated category signatures to direct user attention with pinpoint accuracy. Interface elements prioritize crisp structural boundaries, low-opacity vitreous materials, and laser-precise typography, ensuring readability under rapid countdown timers.

## Colors
The color architecture is anchored in absolute obsidian and deep slate values, producing infinite visual depth against which chromatic neon frequencies trigger instant category recognition.

### Foundational Canvas & Glass Tokens
- **Background Canvas**: `#090A10` — The foundational dark void.
- **Surface Elevation 1 (Card/Panel)**: `#11131F` — Structural base with 60% to 85% alpha for glassmorphism.
- **Surface Elevation 2 (Active/Hover)**: `#1A1D2E` — Raised interaction tier.
- **Surface Border/Divider**: `rgba(255, 255, 255, 0.08)` — Standard low-contrast separation.
- **Text Primary**: `#FFFFFF` — Optical pure white for question headers and scores.
- **Text Secondary**: `rgba(255, 255, 255, 0.65)` — Explanatory copy and metadata.
- **Text Muted**: `rgba(255, 255, 255, 0.35)` — Inactive indicators and placeholders.

### Category Accent Tokens
Each core trivia vertical possesses an immutable neon signature used for dynamic lighting, category pills, borders, and state indicators:
- **Historia (History)**: `#FFD000` (Neon Gold / Amber)
- **Geografía (Geography)**: `#00F0FF` (Electric Cyan / Ice Blue)
- **Arte (Art)**: `#FF2A6D` (Vivid Coral Pink)
- **Deportes (Sports)**: `#FF6B00` (Vibrant Orange)
- **Ciencia (Science)**: `#05FFA1` (Neon Emerald / Cyber Green)
- **Entretenimiento (Entertainment)**: `#BD00FF` (Neon Purple / Violet)

### Functional Feedback States
- **Success / Correct**: Uses `#05FFA1` (Ciencia Green) with a 20% alpha background tint.
- **Failure / Incorrect**: Uses `#FF2A6D` (Arte Coral) with a 20% alpha background tint.
- **Neutral Warning / Timer Urgency**: Transitions through `#FFD000` to `#FF2A6D` under 5 seconds.

## Typography
The typographic system pairs the razor-sharp geometric proportions of **Outfit** for structural communication with **Space Mono** for data readouts, timers, point allocations, and category tags.

- **Scale Differentiation**: Large display scores and category headings utilize dense negative letter-spacing (`-0.02em` to `-0.03em`) to mimic physical digital apparatus displays.
- **Data Clarity**: Timers, multiplier counters, and index markers (`Q.01 / 10`) always render in `Space Mono` to eliminate optical shifting during dynamic countdown ticks.
- **Hierarchy Enforcement**: Primary trivia prompts must never drop below 18px on mobile devices, ensuring zero latency in visual recognition during competitive play.

## Layout & Spacing
The layout relies on a constrained, centered content column designed to keep critical decision components within immediate thumb-reach or primary focal vision. 

- **Mobile (< 768px)**: 4-column fluid layout with `1rem` outer margins. Answer options stack vertically with `0.75rem` vertical spacing, pinned above navigation zones.
- **Tablet (768px - 1024px)**: 8-column layout with `2rem` margins. Option sets convert into a 2x2 symmetrical grid.
- **Desktop (> 1024px)**: 12-column grid capped at a maximum width of `840px` for the core gameplay hub, preventing eye strain from excessive scan distances. Ancillary telemetry (leaderboard, room code, statistics) docks to the perimeter margins.

## Elevation & Depth
Elevation is generated through translucent glassmorphic layering, subtle specular highlights, and chromatic outer glow blurs rather than traditional drop shadows.

- **Vitreous Backplates**: All primary cards utilize `rgba(17, 19, 31, 0.7)` paired with `backdrop-filter: blur(16px)` and a crisp `1px` inner stroke of `rgba(255, 255, 255, 0.08)`.
- **Neon Atmospheric Glow**: Dynamic focus and selection states project calibrated Gaussian blurs using the category's signature color:
  - *Resting Card*: `box-shadow: none`
  - *Focused/Selected Answer*: `box-shadow: 0 0 20px rgba(var(--neon-rgb), 0.35), inset 0 0 12px rgba(var(--neon-rgb), 0.15)`
  - *Correct Response*: `box-shadow: 0 0 30px rgba(5, 255, 161, 0.5), inset 0 0 15px rgba(5, 255, 161, 0.2)`
- **Depth Tiering**: The question arena floats above the base canvas via an ambient soft radial background glow matching the active category at 8% opacity.

## Shapes
The shape philosophy favors sleek, technical precision. Surfaces utilize low-radius (`0.25rem` to `0.5rem`) soft edges to echo professional simulation terminals, rejecting overly round or playful bubble aesthetics. Category indicator dots, status nodes, and countdown rings maintain pure Euclidean circular geometry (`50%`), balancing the hard-angled structural architecture of cards and choice buttons.

## Components

### Answer Option Cards
The primary interactive module. Built with a default background of `rgba(17, 19, 31, 0.8)`, a `1px` border of `rgba(255, 255, 255, 0.08)`, and `0.375rem` corner radius.
- **State Changes**: On selection, the border shifts to the active category’s hex code, accompanied by a targeted `0 0 16px` neon glow. Incorrect lock-in changes the border to `#FF2A6D` with a subtle horizontal shake animation; correct confirmation illuminates `#05FFA1`.
- **Index Tag**: Features a fixed monospaced letter prefix (`A`, `B`, `C`, `D`) encased in a `rgba(255, 255, 255, 0.05)` inset pill with active color mirroring.

### Category Chips & Badges
Subtle, hyper-functional badges that announce vertical categorization without visual noise.
- **Structure**: `Space Mono` typography in uppercase, tracked out (`0.08em`).
- **Surface**: `rgba(255, 255, 255, 0.03)` with a `1px` solid border colored directly by the category neon token at 40% alpha. Accompanied by a leading 6px glowing geometric dot of the exact neon accent.

### Action Buttons
- **Primary Glow Button**: Solid high-contrast white `#FFFFFF` text against a filled category-colored background or translucent obsidian surface with a `1px` category-glow outline. For high-impact triggers (e.g., "Ready", "Submit"), use a high-saturation fill with black text (`#090A10`) for sheer visual dominance.
- **Ghost/Tertiary Button**: Borderless, white text at 65% opacity, shifting to 100% white with a faint underline highlight on hover.

### Dynamic Linear & Radial Timers
- High-precision countdown modules utilizing an SVG stroke-dasharray technique. The track is set to `rgba(255, 255, 255, 0.08)`, and the active bar glows in the category's primary color, shifting progressively to `#FF2A6D` when less than 20% of the countdown remains.

### Input Fields (Code Entry & Setup)
- Clean, monospaced numeric/text boxes with a deep slate fill (`#11131F`). Carets are solid neon cyan (`#00F0FF`) with a matching glow. Unfocused inputs retain a `1px` white stroke at 10% opacity, snapping to category glow on active focus.

### Selection Controls (Radio / Toggles)
- Custom square or hexagonal checkboxes with cut corners. Selection fill snaps instantly to `#00F0FF` or `#05FFA1` without transition delays, maintaining an uncompromising arcade-like responsiveness.