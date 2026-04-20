# Implementation Roadmap

> **Last Updated**: 2026-04-06  
> **Current Phase**: Pre-Phase 1 (Mock data, no auth, no database)

---

## Phase 1: Foundation (Database + Auth)

**Goal**: Replace mock data with real database, add user authentication.

- [ ] Create all core database tables (salons, services, artists, categories)
- [ ] Set up Google Auth via Lovable Cloud
- [ ] Create `profiles` table with trigger on auth.users insert
- [ ] Seed database with current mock data
- [ ] Replace `useSalons()` hook with real Supabase queries
- [ ] Replace mock service/artist/review imports with DB queries
- [ ] Add RLS policies for all tables
- [ ] Persist cart to localStorage or database

---

## Phase 2: Booking & Reviews CRUD

**Goal**: Real booking creation, management, and review system.

- [ ] Booking creation with slot conflict detection
- [ ] Booking cancellation with reason + slot release
- [ ] Booking reschedule flow
- [ ] Review creation after completed booking
- [ ] Review helpful counter
- [ ] Favorites persistence in database (replace localStorage)
- [ ] Real booking history in Bookings page

---

## Phase 3: Payments

**Goal**: PhonePe integration with conditional pay-at-salon.

- [ ] PhonePe edge function proxy
- [ ] Flutter bridge `openPayment` → `paymentResult` flow
- [ ] Payment status tracking in bookings table
- [ ] `payment_rules` table for conditional cash option
- [ ] Web fallback: redirect to PhonePe web checkout
- [ ] Refund flow for cancelled bookings

---

## Phase 4: Notifications & Smart Features

**Goal**: Push notifications, check-in, late detection.

- [ ] FCM token sync via `setPushToken` bridge handler
- [ ] `device_token` storage in profiles table
- [ ] Booking confirmation push notification
- [ ] 30-minute reminder notification
- [ ] "On My Way" button + status update
- [ ] Late detection edge function (GPS vs salon vs time)
- [ ] Auto-cancel with 5-min grace period
- [ ] Notification deep-linking via `notificationOpened`

---

## Phase 5: Loyalty & Portfolios

**Goal**: Streak system, reliability scores, barber portfolios.

- [ ] `streaks` table + increment on booking completion
- [ ] Streak display (flame counter)
- [ ] Salon-owner reward threshold configuration
- [ ] Reward auto-apply at threshold
- [ ] `no_show_flags` table + increment on no-show
- [ ] Yellow flag display in Partner App (barber view only)
- [ ] `portfolio_photos` table + storage bucket
- [ ] Camera integration via Flutter bridge
- [ ] On-device face detection + blur toggle
- [ ] Artist portfolio gallery in salon detail

---

## Phase 6: Partner App

**Goal**: Separate project for salon owners and employees.

- [ ] New project setup
- [ ] Employee walk-in FAB → service selection → schedule sync
- [ ] Admin dashboard: earnings, bookings, ratings, growth
- [ ] Booking management: accept/decline/reschedule
- [ ] Service CRUD management
- [ ] Calendar with daily timeline
- [ ] Cash payment toggle per-customer
- [ ] Trojan Bell: push notification → loud jingle
- [ ] Trojan Bell volume + enable/disable settings
- [ ] `salon_staff` table with admin/employee roles

---

## Phase 7: Company Dashboard

**Goal**: Platform-wide administration and analytics.

- [ ] Desktop web app (separate project)
- [ ] Executive dashboard: revenue, users, bookings, partners
- [ ] User management table
- [ ] Salon partner management
- [ ] Global service category management with commission rates
- [ ] Payment + commission tracking
- [ ] Analytics: service distribution, booking trends, top salons
- [ ] Banner campaign management
- [ ] Promotion engine
- [ ] Trojan Bell jingle management

---

*Phases are sequential but can overlap. Each phase should be fully tested before moving to the next.*
