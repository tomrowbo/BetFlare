# BetFlare UI Redesign Plan

> **Goal**: Make the app look and feel like the landing page (betflare-landing-ui). Purely cosmetic/UX — no business logic changes. Componentize all UI into individual files.

You have the very important job of taking our not-so-beautiful app and making it look and feel like our beautiful landing page but you MAY NOT make any business logic changes to the app. You may update the feel/copy/content of the UI and restructure, reorganise to give the app a modern, sleek feel that is just like our landing page (use the landing page as heavy influence). The core functionality of the app should stay the same though. This is purely a cosmetic and UX change. Analyse both code bases, and come up with a high level plan to implement this. I want the UI of the app to be componentized, each in it's own file so that I can easily edit this in the future.

Key Visual DNA to Port
Dark-first: Near-black bg, dark-grey cards, white text
BetFlare Orange as the primary accent (not blue)
Space Grotesk for all headings, making them uppercase with tight tracking
Glass card pattern (semi-transparent bg + backdrop blur + white/5 borders)
Bottom-line accent on card hover (primary color bar that scales in from left)
Micro-label typography: text-[10px] uppercase tracking-[0.2em] font-bold
Framer Motion for subtle entrance animations and hover states
Lucide icons replacing emojis

---

## Phase 1: Design System Foundation ✅

- [x] **1. Update `globals.css`** — Switch all CSS variables to dark theme tokens matching landing page
- [x] **2. Update `tailwind.config.js`** — Add Space Grotesk font, semantic colors, keyframe animations
- [x] **3. Update `layout.tsx`** — Import Google Fonts (Inter + Space Grotesk), set dark body classes
- [x] **4. Install dependencies** — `framer-motion`, `lucide-react`, `clsx`, `tailwind-merge`

---

## Phase 2: Shared UI Primitives ✅

- [x] **5. Create `lib/utils.ts`** — `cn()` helper (clsx + tailwind-merge)
- [x] **6. Create `components/ui/GlassCard.tsx`** — Reusable glass-card component (backdrop-blur, white/5 borders, hover→primary)
- [x] **7. Create `components/ui/StatusBadge.tsx`** — LIVE / PENDING / RESOLVED badges in landing page style
- [x] **8. Create `components/ui/SectionHeading.tsx`** — Tag + uppercase heading pattern from landing page

---

## Phase 3: Core Layout ✅

- [x] **9. Restyle `Header.tsx`** — Dark nav with backdrop blur, orange accent, Space Grotesk branding
- [x] **10. Create `components/PageContainer.tsx`** — Page wrapper with grid-bg background, consistent spacing

---

## Phase 4: Home Page (extract inline components + restyle) ✅

- [x] **11. Extract `components/home/HeroBanner.tsx`** — Dark hero with TVL/market stats
- [x] **12. Extract `components/home/FeaturedMarketCard.tsx`** — Glass card, Lucide icons, hover animations
- [x] **13. Extract `components/home/MarketListItem.tsx`** — Compact dark market row
- [x] **14. Extract `components/home/ComingSoonCard.tsx`** — Muted upcoming market card
- [x] **15. Extract `components/home/CategoryTabs.tsx`** — Category filter pills with dark styling
- [x] **16. Extract `components/home/LiquidityCTA.tsx`** — LP banner with glow effects
- [x] **17. Simplify `page.tsx`** — Compose from extracted components (all business logic stays)

---

## Phase 5: Market Detail Page (restyle) ✅

- [x] **18. Restyle `MarketCard.tsx`** — Dark glass card, orange accents, sharp typography
- [x] **19. Restyle `BetSlip.tsx`** — Dark inputs, orange primary CTA
- [x] **20. Restyle `PriceChart.tsx` + `MiniPriceChart.tsx`** — Dark chart bg, orange-tinted colors
- [x] **21. Restyle `PositionView.tsx`** — Dark position cards
- [x] **22. Restyle `LivePrice.tsx`** — Dark theme with orange accents
- [x] **23. Restyle market detail `[slug]/page.tsx`** — Banners, breadcrumbs in dark theme

---

## Phase 6: Portfolio Page (extract + restyle) ✅

- [x] **24. Extract `components/portfolio/PositionCard.tsx`** from inline in portfolio page
- [x] **25. Extract `components/portfolio/RedeemedHistoryCard.tsx`** from inline in portfolio page
- [x] **26. Restyle portfolio page** — Dark cards, consistent with design system

---

## Phase 7: Liquidity Page (restyle) ✅

- [x] **27. Restyle `liquidity/page.tsx`** — Dark cards, orange accents, glass effects

---

## Phase 8: Skeletons ✅

- [x] **28. Restyle `Skeleton.tsx`** — Dark shimmer effect matching new theme

---

## What Won't Change (Business Logic Preserved)

- All `wagmi` hooks (`useReadContract`, `useWriteContract`, etc.)
- Contract interactions, ABI calls, transaction flows
- State management (`useState`, `useMemo`, `useCallback`)
- Page routing and navigation structure
- Data processing (market categorization, price formatting, balance calculations)
- `config/contracts.ts` and `config/wagmi.ts` — completely untouched
- `providers.tsx` — completely untouched

---

## Design Language Reference (from Landing Page)

| Element | Style |
|---------|-------|
| Background | Near-black `hsl(0 0% 4%)` |
| Cards | Glass effect: `bg-card/80 backdrop-blur-md`, `white/5` borders |
| Primary color | BetFlare Orange `hsl(26 85% 54%)` |
| Headings | Space Grotesk, uppercase, `tracking-tighter`, bold |
| Labels | `text-[10px] uppercase tracking-[0.2em] font-bold` |
| Card hover | Border → primary, bottom-line accent scales in from left |
| Icons | Lucide React (replacing emojis) |
| Animations | Framer Motion entrance/hover effects |
| Accents | Grid-bg pattern, glow orbs, gradient lines |

