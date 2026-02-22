# Testing Admin Features: Burnout, Organogram & Role Scoping

## Setup

1. **Seed the database** (from `aidcare-backend/`):
   ```bash
   python seed_demo.py
   ```

2. **Start backend** (if not running):
   ```bash
   uvicorn main:app --reload --port 8000
   ```

3. **Start frontend**:
   ```bash
   cd aidcare-copilot && npm run dev
   ```

4. **Login** at http://localhost:3000/login (password for all: `demo1234`)

---

## Test Accounts & Expected Scope

| Role | Email | Scope |
|------|-------|-------|
| **Super Admin** | `superadmin@aidcare.ng` | All orgs: Lagos State Ministry (LASUTH + GHI) + HealthPlus Foundation |
| **Org Admin** | `orgadmin@lagoshealth.ng` | Lagos State Ministry only: LASUTH + General Hospital Ikeja |
| **Hospital Admin** | `admin@lasuth.ng` | LASUTH only (4 wards, 6 doctors) |
| **Hospital Admin** | `admin@ghi.ng` | General Hospital Ikeja only (2 wards, 2 doctors) |
| **Hospital Admin** | `admin@healthplus.ng` | HealthPlus Clinic only (2 wards, 2 doctors) |
| **Doctor** | `chioma@lasuth.ng` | Personal burnout only (no admin views) |

---

## What to Test

### 1. Admin Dashboard (`/admin`)

- **Super Admin**: Team stats across all orgs; doctor cards from LASUTH, GHI, HealthPlus; unit overview for all hospitals.
- **Org Admin**: Same but only Lagos State Ministry (LASUTH + GHI). No HealthPlus data.
- **Hospital Admin (LASUTH)**: Only LASUTH doctors and wards.
- **Hospital Admin (GHI)**: Only GHI doctors and wards.

### 2. Organogram Tab (Admin page)

- **Super Admin**: Org → Hospital → Ward → Doctors tree for both organizations.
- **Org Admin**: Single org (Lagos State Ministry) with LASUTH and GHI.
- **Hospital Admin**: Single hospital with wards and doctors.

Verify:
- Hospital admins appear under each hospital (e.g. Dr. Amara Okafor under LASUTH).
- Ward doctors show CLS and status (green/amber/red).
- Burnout status badges are correct.

### 3. Burnout Page (`/burnout`)

- **Doctors**: Only "My Burnout" tab (personal CLS, breakdown, 7-day history).
- **Admins**: Tabs: "My Burnout" | "Team Dashboard" | "Organogram".

**Team Dashboard**: Stats and doctor cards scoped by role (same as admin dashboard).
**Organogram**: Same hierarchy as admin page, scoped by role.

### 4. Burnout Data in Seed

| Doctor | CLS | Status |
|--------|-----|--------|
| Dr. Chioma Adebayo | 82 | red |
| Dr. Kemi Afolabi | 65 | amber |
| Dr. Yusuf Ibrahim | 48 | amber |
| Dr. Amara Okafor (LASUTH admin) | 55 | amber |
| Dr. Tayo Bakare (HP admin) | 45 | amber |
| Dr. Emeka Nwosu (GHI admin) | 42 | green |
| Dr. Funke Adeyemi | 38 | green |
| Dr. Mercy Okeke | 35 | green |
| Dr. Sarah Ogundimu | 28 | green |

---

## Quick Test Flow

1. Login as `orgadmin@lagoshealth.ng` / `demo1234`
2. Go to **Admin** → verify LASUTH + GHI data only (no HealthPlus)
3. Click **Organogram** tab → verify Lagos State Ministry with LASUTH and GHI
4. Go to **Burnout** → switch to **Team Dashboard** → verify same scope
5. Switch to **Organogram** → verify hierarchy
6. Login as `admin@lasuth.ng` → verify LASUTH-only scope everywhere
7. Login as `superadmin@aidcare.ng` → verify all orgs visible
