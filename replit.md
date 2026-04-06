# Mon Frigo — Replit Project

## Overview
A full-stack Expo mobile app for fridge management. Users can scan product barcodes (via camera + Open Food Facts API), photograph expiry dates, track multiple shared fridges, mark items as consumed (with shake-to-undo), and invite others by email. Full French/English i18n, cold blue/frosted glass aesthetics, dark/light mode support.

## Architecture

### Monorepo Structure
- `artifacts/mon-frigo/` — Expo React Native mobile app (main artifact)
- `artifacts/api-server/` — Express API server (not used by Mon Frigo, pre-existing)
- `artifacts/mockup-sandbox/` — Vite mockup server (canvas previews)

### Mon Frigo App Structure
```
artifacts/mon-frigo/
├── app/
│   ├── _layout.tsx           # Root layout with all providers + auth routing
│   ├── (auth)/               # Auth screens (login, register)
│   ├── (tabs)/               # Main tab screens (fridge, sessions, settings)
│   ├── scan/                 # Scan flow (barcode → expiry → confirm → summary)
│   ├── session/[id].tsx      # Session detail
│   └── item/[id].tsx         # Item detail
├── components/
│   ├── ItemCard.tsx          # Product card with urgency colors
│   ├── ConsumeSheet.tsx      # Bottom sheet for consuming items
│   ├── FAB.tsx               # Floating action button (scan trigger)
│   └── FridgeSelector.tsx    # Fridge picker dropdown
├── contexts/
│   ├── AuthContext.tsx       # Supabase auth
│   ├── FridgeContext.tsx     # Fridge CRUD + real-time + shake-to-undo
│   └── ScanContext.tsx       # Scan session management
├── hooks/
│   ├── useColors.ts          # Color scheme hook
│   └── useShake.ts           # Accelerometer shake detection
├── i18n/                     # French/English translations
├── constants/colors.ts       # Design tokens (light/dark)
├── lib/supabase.ts           # Supabase client + types
├── config.ts                 # App constants
└── supabase-schema.sql       # DB schema (run in Supabase dashboard)
```

## Backend: Supabase

### Tables
- `fridges` — id, name, color, icon, owner_id
- `fridge_members` — fridge_id, user_id, role (owner/member)
- `fridge_invitations` — fridge_id, invited_email, invited_by, status, token
- `scan_sessions` — fridge_id, user_id
- `scanned_items` — session_id, fridge_id, barcode, product_name, brand, expiry_date, quantity, consumed

### Setup
Run `supabase-schema.sql` in the Supabase SQL Editor to create all tables with RLS policies.

## Environment Variables
- `SUPABASE_URL` — Supabase project URL (secret)
- `SUPABASE_ANON_KEY` — Supabase anon key (secret)
- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` — auto-set in `.env.local`

## Key Packages
- `@supabase/supabase-js` — database + auth + realtime
- `expo-camera` — barcode scanning + photo capture
- `expo-sensors` — shake detection (Accelerometer)
- `expo-linear-gradient` — blue frosted glass backgrounds
- `i18n-js` + `expo-localization` — FR/EN internationalization
- `@react-native-async-storage/async-storage` — local persistence

## Design System
- Cold blue palette: `#0A1929` (dark bg), `#1E3A5F` (primary), `#60A5FA` (accent)
- Urgency colors: red (expired/today), orange (≤3 days), yellow (≤7 days), green (>7 days)
- Typography: Inter 400/500/600/700
- Frosted glass: `rgba(255,255,255,0.07)` overlays with blur

## External APIs
- Open Food Facts: `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`
