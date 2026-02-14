# Petverse Agent Guide

## Install

- `npm i`

## Development

- `npm run dev`
- `npm run build`
- `npm run start`

## Component Hygiene Rules

R1) One file = one React component OR one hook OR one util module.  
R2) Client boundary clarity: browser APIs / zustand hooks / R3F hooks => *.client.tsx.  
R3) Public API only imports: folders imported externally must expose index.ts; no deep imports.  
R4) >250 LOC is a split candidate.  
R5) State mutation logic goes to features/*/model or store actions.  
R6) Layer boundaries: components/ui pure; three isolated; domain usable everywhere.  
R7) Minimal-change policy.

## How to decide client vs server component

- Use `*.client.tsx` when any of the following are used:
  - WebGL / React Three Fiber (`@react-three/fiber`, `@react-three/drei`)
  - zustand hooks (`useGameStore`, etc.)
  - `localStorage`
  - `window` / `document`
- Prefer Server Components when none of the above is needed and rendering can stay pure/serializable.

Examples:

- `CageSceneCanvas.client.tsx` for WebGL + R3F hooks.
- `LanguageSwitcher.client.tsx` for `localStorage` + browser interactions.
- `app/(game)/cage/page.tsx` can stay Server and render client children.

## Pre-finish Checklist

- Run `npm run lint` (fix until green)
- Run `npm run typecheck` (fix until green)
- Run `npm run test:ci` (fix until green)

## Useful Local Commands

- `npm run test:watch`
- `npm run format`
- `npm run format:write`
