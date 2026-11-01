# TEEFAHS CLOTHIER — Modest Fashion Boutique E-Commerce Platform

Official web platform for **Teefahs Clothier**, a luxury modest fashion boutique in Lagos, Nigeria.

- **Founder & Creative Director:** Queen Lateefah (`queenlateefalive@yahoo.com`)
- **Official WhatsApp Orders:** `+234 802 899 1921` ([https://wa.me/2348028991921](https://wa.me/2348028991921))
- **Physical Boutique Address:** 165 Ekoro Road, Ekoro Junction, Abule Egba, Ikeja, Lagos, Nigeria
- **Bumpa Store:** [https://teefahsclothier.bumpa.shop](https://teefahsclothier.bumpa.shop)
- **Instagram:** [@teefahs_clothier](https://instagram.com/teefahs_clothier)

---

## 1. System Architecture

The application is built with a high-performance modern web stack:
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Backend / Database:** Supabase PostgreSQL (`mxovvqjyfgyrzjauzodh.supabase.co`).
- **State Management:** React Context API for Cart, Wishlist, and Catalogue caching.
- **Order Channel:** Direct WhatsApp integration with pre-formatted, itemized order summaries.

---

## 2. Live Database Catalogue & Inventory State

The live Supabase database is fully seeded and verified:
- **Categories (8):** Abayas, Khimars, Hijabs, Veils, Prayer Wear, Occasion Wear, Caps, Accessories.
- **Products (11):** 11 bespoke modest garments with editorial photography, descriptions, and pricing in NGN.
- **Product Images (54):** 54 high-resolution editorial photoshoot photographs correctly associated with product UUIDs.
- **Variations (27):** 27 size and colour variations with SKU codes.
- **Total Stock (267):** 267 total physical inventory units distributed across variations.
- **Data Integrity:** 0 orphaned products, 0 orphaned images, 0 orphaned variations.

---

## 3. Database Security & Row Level Security (RLS)

All public tables have Row Level Security enabled:
- **Public / Anonymous Visitors:**
  - `SELECT` permission on published products (`is_published = true`), active categories (`is_active = true`), associated product images, and active variations.
  - Zero write, update, or delete privileges.
  - Cannot alter inventory stock quantities or manipulate catalogue prices.
- **Store Administrator:**
  - Full CRUD permissions on categories, products, images, and variations.
  - Admin authentication checked via authenticated Supabase role or store owner email (`queenlateefalive@yahoo.com`).

---

## 4. Admin Dashboard Access & Management

The store administrator dashboard is accessible directly from the storefront header (Store icon) or via the `/admin` route.
- **Default Owner Profile:** Queen Lateefah (`queenlateefalive@yahoo.com`), Role: Store Owner.
- **Features:**
  - **Catalogue Overview:** View, search, and toggle published/new arrival status for all products.
  - **Add Garment:** Create new garments with auto-generated slugs, category selection, 54-photo picker, and custom size/colour variation pills.
  - **Edit Garment:** Update descriptions, pricing, sale prices, and image ordering.
  - **Inventory Manager:** Live stock increment/decrement per variation with instant database synchronization.
  - **Category Manager:** Add or edit boutique categories and descriptions.

---

## 5. Development & Deployment

### Running Locally
```bash
npm install
npm run dev
```

### Building for Production
```bash
npm run build
```

### Database Schema & Seed Scripts
- `database/schema.sql`: Table definitions, foreign key constraints, indexes, and RLS policies.
- `database/seed.sql`: Safe, idempotent seed script using hexadecimal UUIDs and `ON CONFLICT` clauses.
