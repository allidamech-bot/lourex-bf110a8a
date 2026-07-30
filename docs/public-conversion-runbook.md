# H8 Public Conversion & Trust Polish Runbook

## Scope
- Home page (`src/pages/public/HomePage.tsx`) - Landing messaging
- Products page (`src/pages/public/ProductsPage.tsx`) - Product discovery
- Product detail page (`src/pages/public/ProductDetailPage.tsx`) - Product context → request flow
- Request page (`src/pages/public/RequestPage.tsx`) - Request form
- Contact page (`src/pages/public/ContactPage.tsx`) - Contact flow
- Why Lourex page (`src/pages/public/WhyLourexPage.tsx`) - Trust messaging
- HeroSection (`src/components/HeroSection.tsx`) - Shared entry point

## CTA Path Clarity

The public visitor flow is:
1. **Home** → "Start a purchase request" or "Track shipment" buttons
2. **Products** → "Create sourcing request" with product context → `/request?source=products`
3. **Product Detail** → "Request sourcing with this product" → `/request?source=products&product={id}`
4. **Request** → Form captures specifications, quantity, destination
5. **Contact** → Alternative path for inquiries

## How Lourex Works (Trust Messaging)

**Product Discovery Flow:**
- Browse examples in catalog
- Request remains free-form based on specifications, quantity, destination
- No marketplace prices or inventory claims

**Sourcing Coordination Flow:**
- Every request is reviewed for completeness
- Structured deals connect customer, Turkish partner, Saudi partner, operations
- Official 11-stage tracking visible to authorized parties
- Financial entries lock after creation with formal edit requests

**Regional Focus:**
- Turkey-Syria to Saudi Arabia and neighboring markets
- Source-side (Turkey) and destination-side (Saudi) partner coordination

## Changes Made in H8

### HeroSection.tsx
- Added process indicator under hero description: "Structured process: intake → review → coordination → tracking → delivery"

### ProductDetailPage.tsx  
- No changes needed - already has clear "Request sourcing with this product" CTA with product context

### WhyLourexPage.tsx
- Already has trust messaging via i18n keys: "why.reason1Title/Desc" through "why.reason6Title/Desc"

## Validation Commands

```bash
npm run typecheck
npm run build
npm run lint
```

## Safety Invariants Verified
- No migrations added
- No RLS policies modified
- No Supabase logic changed
- No DB/schema changes
- No dependencies added
- No fake prices/availability invented
- No exaggerated claims added
- SEO/AEO metadata preserved
- Arabic/English i18n maintained