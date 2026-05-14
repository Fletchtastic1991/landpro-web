# LandPro Web
 
Frontend application for the LandPro land intelligence platform.
 
## Stack
 
- **Vite + React + TypeScript** — frontend framework
- **Tailwind CSS** — styling
- **Mapbox GL JS** — map rendering, boundary drawing, address search
- **Supabase** — database, auth, edge functions
- **Shadcn/ui** — component library
## Architecture
 
LandPro is built in two separate systems that will eventually connect:
 
### System A — Truth Layer (do not modify)
Evaluates land parcels from verified survey records.
 
```
src/lib/memory/          → parcel facts storage
src/lib/parcel-state/    → current parcel state
src/lib/events/          → event logging
src/lib/sitepro/         → "Is this land viable?" (suitable/inconclusive/blocked)
src/lib/decision-engine/ → orchestrates Memory → SitePro → result
src/lib/readiness/       → milestone tracking
src/lib/sequencer/       → runs multiple parcels through decision engine
```
 
### System B — Field Estimation Layer
Estimates clearing and fence costs from contractor field observations.
 
```
src/engines/ClearingPro.ts      → clearing cost engine (hours × rates)
src/engines/FencePro.ts         → fence calculation engine (geometry + labor)
src/engines/LandProEngine.ts    → orchestrator (calls both engines)
src/engines/buildReportView.ts  → UI adapter (formats engine output for display)
src/components/JobReport.tsx    → display only (reads from buildReportView)
```
 
### Data flow
 
```
User draws boundary → MapDrawing.tsx
User fills toggles  → LandSelectors.tsx
                         ↓
                   LandProEngine.ts
                   ├── ClearingPro.ts
                   └── FencePro.ts
                         ↓
                   buildReportView.ts  (formatting only)
                         ↓
                   JobReport.tsx       (display only)
```
 
## Getting Started
 
```bash
# Install dependencies
npm install
 
# Copy environment template
cp .env.example .env.local
# Fill in your Supabase and Mapbox credentials
 
# Run development server
npm run dev
```
 
## Environment Variables
 
See `.env.example` for required variables. Never commit `.env.local`.
 
## Related Repos
 
- **[landpro-intelligence](https://github.com/Fletchtastic1991/landpro-intelligence)** — Python FastAPI service for terrain analysis, site assessment, and operational intelligence
## Deployment
 
Deployed on Vercel. Pushes to `main` deploy automatically.