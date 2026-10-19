# Phase 1 — Local shell and theme

**Goal.** Someone opens the app locally, lands immediately in the workspace
shell without authentication barriers or external SaaS dependencies, in the
theme they prefer.

This phase establishes the clean local foundation and design system tokens
that all subsequent analysis panels and canvases render inside.

## Build

- **Local Application Shell.** A dense, developer-focused workspace shell with
  the `cartograph` header and full-viewport main canvas container.
- **Direct Local Access.** No sign-in wall, external tokens, or cloud redirects.
  Visiting `/` lands immediately inside the workspace on first paint.
- **Theme Control.** Three states: follow the system, force light, force dark.
  Written to `data-theme` on the root element with cookie persistence so server
  rendering sets the palette before first byte paints (no white flash).
- **Design Tokens.** Consistent palette using Tailwind v4 and CSS variables
  (`--canvas`, `--surface`, `--raised`, `--line`, `--fg`, `--fg-muted`, `--accent`).

## Constraints

- **Zero SaaS Dependencies for Auth.** No Clerk or external identity provider.
  The app operates locally and offline.
- **No Flash of Unstyled Theme.** The theme must be parsed from the cookie during
  server rendering and applied to `<html> data-theme` on the initial response.
- **Nothing moves unless clicked.** Dense typography, monospace paths, and zero
  ambient motion.

## Acceptance check

1. Visit `http://localhost:3000/` in an incognito window or normal tab. It
   renders the workspace shell immediately (HTTP 200) with no redirects.
2. Toggle the theme control across `system`, `light`, and `dark`. Confirm that
   forcing light mode wins even when system/OS preference is set to dark.
3. Reload the page; the selected theme persists without flicker or hydration
   mismatch.
4. Verify the header branding, theme switcher, and workspace container render
   cleanly with strict TypeScript types and zero console warnings.