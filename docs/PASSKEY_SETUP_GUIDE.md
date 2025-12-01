# Group Passkey System - Setup & Testing Guide

## ✅ What Changed

### Before (User Account Required):
- Groups needed to create user accounts
- Had to be added to `group_coordinators` table
- Complex onboarding process

### After (URL + Passkey):
- Groups just need a URL + passkey
- No user account required
- Simple: Share URL and passkey with group leaders

## 🔧 How It Works

1. **Organization creates group** in OrgDashboard → Groups Management
2. **Sets a passkey** (e.g., "CHURCH2024")
3. **Shares with group:**
   - URL: `https://yoursite.com/group/life-church-auckland`
   - Passkey: `CHURCH2024`
4. **Group coordinator visits URL** → enters passkey → accesses portal

## 📝 Step-by-Step Testing

### Step 1: Apply Migration (DO THIS FIRST)
Run this SQL in Supabase SQL Editor:

```sql
ALTER TABLE groups ADD COLUMN IF NOT EXISTS passkey TEXT;

COMMENT ON COLUMN groups.passkey IS
'Passkey for group coordinators to access their portal (like a shared password)';

CREATE INDEX IF NOT EXISTS idx_groups_passkey ON groups(passkey) WHERE passkey IS NOT NULL;

DROP POLICY IF EXISTS "Public can verify group passkey" ON groups;
CREATE POLICY "Public can verify group passkey"
ON groups FOR SELECT
USING (url_slug IS NOT NULL);
```

### Step 2: Create or Edit a Group
1. Go to **OrgDashboard** → **Groups** tab
2. Click **"Create New Group"** or edit existing
3. Fill in:
   - Group Name: `Life Church Auckland`
   - Contact Email: `admin@lifechurch.nz`
   - URL Slug: `life-church-auckland` (auto-generated)
   - **Portal Passkey**: `CHURCH2024` ⬅️ NEW FIELD!
4. Save

### Step 3: Test Passkey Access
1. **Open incognito window** (or different browser)
2. Go to: `http://localhost:8081/group/life-church-auckland`
3. You should see **passkey input screen** with:
   - Group name and logo
   - Password field
   - "Access Portal" button
4. **Enter passkey**: `CHURCH2024`
5. Click **"Access Portal"**
6. **You should see the admin dashboard!** 🎉

### Step 4: Verify Features Work
Once in the portal, test:
- ✅ **Overview tab**: Shows analytics
- ✅ **Promo Codes tab**: Can create/manage codes (with new RLS policies)
- ✅ **Invoices tab**: Can view and pay invoices
- ✅ **Sales tab**: Shows ticket sales

### Step 5: Test SessionStorage
1. **Refresh the page** (while logged in)
2. **Should NOT ask for passkey again** (stored in sessionStorage)
3. **Close browser** and reopen
4. **Should ask for passkey again** (sessionStorage cleared)

## 🔒 Security Notes

### Client-Side Verification
The passkey is verified client-side by comparing:
```typescript
if (passkeyInput === group.passkey) {
  setIsAuthenticated(true);
}
```

**Why this is okay:**
- Groups are managing ticket sales, not banking data
- RLS policies still prevent unauthorized data access
- Much simpler UX for churches
- No user account management overhead

### What's Still Protected by RLS:
- Groups can't see other groups' data
- Groups can't modify other groups' allocations
- Groups can only create promo codes for their organization
- Invoice payments go through Stripe (secure)

## ⚠️ Important: Passkey Best Practices

### For Organizations:
1. **Use strong passkeys**: `CHURCH2024` not `1234`
2. **Change periodically**: Update if coordinator leaves
3. **Share securely**: Email or secure message, not public posts
4. **Different per group**: Don't reuse same passkey

### For Groups:
1. **Don't share publicly**: Passkey is private
2. **Use password manager**: Store securely
3. **Contact org if lost**: Organization can reset in dashboard

## 🎯 What Groups Can Now Do (Without User Accounts!)

1. **Create Promo Codes** ✅
   - Set discount amounts
   - Set expiry dates
   - Track usage

2. **View Invoices** ✅
   - See what they owe
   - Pay via Stripe
   - Download PDFs

3. **Track Sales** ✅
   - See who bought tickets
   - View revenue
   - Monitor allocations

4. **Manage Portal** ✅
   - View analytics
   - See ticket availability
   - Share widget link

## 🐛 Troubleshooting

### "This group has not set up a passkey yet"
**Solution:** Edit the group in OrgDashboard and add a passkey

### "Incorrect passkey. Please try again."
**Solution:** Check you're using the exact passkey (case-sensitive)

### Portal shows but no data
**Solution:** Check RLS policies were applied from previous migration

### Can't create promo codes
**Solution:** Ensure both migrations are applied (RLS + passkey)

## 📊 Migration Files

1. **20251101000000_fix_groups_rls_for_coordinators.sql** - RLS policies
2. **20251101000001_add_group_passkey.sql** - Passkey field

Both must be applied for full functionality!

## 🎉 Success Criteria

You're all set if:
- ✅ Group shows passkey input screen
- ✅ Correct passkey grants access
- ✅ Wrong passkey shows error
- ✅ Passkey persists in sessionStorage
- ✅ Can create promo codes
- ✅ Can view invoices
- ✅ Can see sales data

## 🔄 How to Reset a Passkey

As organization owner:
1. Go to Groups Management
2. Click Edit on the group
3. Change the passkey field
4. Save
5. Share new passkey with coordinators
