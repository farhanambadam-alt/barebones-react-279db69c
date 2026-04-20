# Database Schema Design

> **Backend**: Lovable Cloud (Supabase)  
> **Last Updated**: 2026-04-06  
> **Status**: Schema design — not yet implemented

---

## 1. Data Consistency Rule (CRITICAL)

> **This rule prevents breakage when migrating from mock data to real database.**

- Database schema **MUST** match existing TypeScript interfaces exactly
- **No renaming fields** without updating UI types in lockstep
- Hooks **MUST** preserve return shape after migration

### Protected Return Shapes

```typescript
// useSalons() must ALWAYS return:
{ featuredSalons, nearbySalons, allSalons, isLoading, error }

// Salon type fields must map 1:1 to DB columns:
// TypeScript camelCase → DB snake_case (handled by Supabase client)
// id, name, image, rating, reviewCount, address, lat, lng, startingPrice, isOpen, tags, offer

// Service type fields:
// id, name, duration, price, originalPrice, category, subcategory

// Artist type fields:
// id, name, avatar, specialty
```

### Migration Rule
When replacing mock data with DB queries:
1. Query result shape must match existing TypeScript interface
2. If DB column name differs from TS field, map it in the query/hook
3. Components consuming the hook must NOT need changes
4. Test hook return shape before and after migration

---

## 2. Core Tables (Phase 1-2)

### `salons`
```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
image TEXT
rating NUMERIC(2,1) DEFAULT 0
review_count INTEGER DEFAULT 0
address TEXT
lat NUMERIC(10,7)
lng NUMERIC(10,7)
starting_price INTEGER
is_open BOOLEAN DEFAULT true
tags TEXT[]
offer TEXT
bookings_this_week INTEGER DEFAULT 0
tagline TEXT
owner_id UUID REFERENCES auth.users(id)
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

### `services`
```sql
id UUID PRIMARY KEY
salon_id UUID REFERENCES salons(id) ON DELETE CASCADE
name TEXT NOT NULL
duration TEXT
price INTEGER NOT NULL
original_price INTEGER
category TEXT NOT NULL  -- 'men' | 'women' | 'packages'
subcategory TEXT        -- 'Hair', 'Skin & Facial', 'Lashes & Brows', etc.
image TEXT
sort_order INTEGER DEFAULT 0
created_at TIMESTAMPTZ DEFAULT now()
```

### `artists`
```sql
id UUID PRIMARY KEY
salon_id UUID REFERENCES salons(id) ON DELETE CASCADE
name TEXT NOT NULL
avatar TEXT
specialty TEXT
experience TEXT
services TEXT[]
created_at TIMESTAMPTZ DEFAULT now()
```

### `categories`
```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
image TEXT
gender TEXT  -- 'male' | 'female' | 'all'
sort_order INTEGER DEFAULT 0
```

### `bookings`
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
salon_id UUID REFERENCES salons(id)
artist_id UUID REFERENCES artists(id)
services JSONB NOT NULL  -- [{service_id, name, price, qty}]
date DATE NOT NULL
time TEXT NOT NULL
status TEXT DEFAULT 'upcoming'  -- 'upcoming' | 'completed' | 'cancelled' | 'late'
cancel_reason TEXT
total_price INTEGER NOT NULL
payment_method TEXT  -- 'online' | 'cash'
payment_status TEXT  -- 'paid' | 'pending' | 'refunded'
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

### `reviews`
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
salon_id UUID REFERENCES salons(id) ON DELETE CASCADE
artist_id UUID REFERENCES artists(id)
rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5)
text TEXT
service TEXT
helpful INTEGER DEFAULT 0
has_photo BOOLEAN DEFAULT false
photos TEXT[]
created_at TIMESTAMPTZ DEFAULT now()
```

### `profiles`
```sql
id UUID PRIMARY KEY
user_id UUID UNIQUE NOT NULL
display_name TEXT
avatar_url TEXT
phone TEXT
email TEXT
device_token TEXT  -- FCM/APNs token
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

### `favorites`
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
salon_id UUID REFERENCES salons(id) ON DELETE CASCADE
created_at TIMESTAMPTZ DEFAULT now()
UNIQUE(user_id, salon_id)
```

### `user_roles`
```sql
CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');

id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
role app_role NOT NULL
UNIQUE(user_id, role)
```

---

## 3. Feature Tables (Phase 3-5)

### `streaks`
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
salon_id UUID REFERENCES salons(id) ON DELETE CASCADE
count INTEGER DEFAULT 0
last_booking_date DATE
reward_threshold INTEGER  -- set by salon owner
reward_text TEXT
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
UNIQUE(user_id, salon_id)
```

### `no_show_flags`
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
count INTEGER DEFAULT 0
last_no_show_date DATE
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
UNIQUE(user_id)
```

### `walk_ins`
```sql
id UUID PRIMARY KEY
salon_id UUID REFERENCES salons(id) ON DELETE CASCADE
artist_id UUID REFERENCES artists(id)
services JSONB NOT NULL
started_at TIMESTAMPTZ DEFAULT now()
estimated_end TIMESTAMPTZ
status TEXT DEFAULT 'active'  -- 'active' | 'completed'
```

### `payment_rules`
```sql
id UUID PRIMARY KEY
salon_id UUID REFERENCES salons(id) ON DELETE CASCADE
user_id UUID NOT NULL
allow_cash BOOLEAN DEFAULT false
created_at TIMESTAMPTZ DEFAULT now()
UNIQUE(salon_id, user_id)
```

### `trojan_bell_config`
```sql
id UUID PRIMARY KEY
salon_id UUID REFERENCES salons(id) ON DELETE CASCADE UNIQUE
jingle_url TEXT
volume INTEGER DEFAULT 100  -- 0-100
enabled BOOLEAN DEFAULT true
updated_at TIMESTAMPTZ DEFAULT now()
```

### `salon_staff`
```sql
id UUID PRIMARY KEY
salon_id UUID REFERENCES salons(id) ON DELETE CASCADE
user_id UUID NOT NULL
role TEXT NOT NULL  -- 'admin' | 'employee'
created_at TIMESTAMPTZ DEFAULT now()
UNIQUE(salon_id, user_id)
```

### `portfolio_photos`
```sql
id UUID PRIMARY KEY
artist_id UUID REFERENCES artists(id) ON DELETE CASCADE
uploaded_by UUID NOT NULL  -- customer user_id
service_name TEXT
image_url TEXT NOT NULL
face_blurred BOOLEAN DEFAULT false
created_at TIMESTAMPTZ DEFAULT now()
```

---

## 4. RLS Policy Patterns

### Customer App (authenticated users)
- `salons`: SELECT for all authenticated
- `services`: SELECT for all authenticated
- `artists`: SELECT for all authenticated
- `categories`: SELECT for all authenticated
- `bookings`: SELECT/INSERT/UPDATE own only (`auth.uid() = user_id`)
- `reviews`: SELECT all, INSERT/UPDATE/DELETE own only
- `profiles`: SELECT own, UPDATE own
- `favorites`: SELECT/INSERT/DELETE own only
- `streaks`: SELECT own only
- `no_show_flags`: **No customer access** (barber-only)

### Partner App (salon staff)
- `bookings`: SELECT all for their salon, UPDATE status for their salon
- `walk_ins`: SELECT/INSERT/UPDATE for their salon
- `no_show_flags`: SELECT for customers who booked at their salon
- `salon_staff`: SELECT for their salon
- `trojan_bell_config`: SELECT/UPDATE for admin role only
- `payment_rules`: SELECT/INSERT/UPDATE/DELETE for admin role only

### Company Dashboard (platform admins)
- Full SELECT on all tables
- UPDATE on system-level tables
- Access via `has_role(auth.uid(), 'admin')` security definer function

---

*This document is referenced by the main PRD. Schema will be implemented via Supabase migrations in Phase 1.*
