# Multi-Organization Support

## Overview

TicketFlo supports users belonging to multiple organizations with different roles. This allows users to:

- **Own** multiple organizations (create and manage their own)
- **Be invited** to other organizations as admin, editor, or viewer
- **Switch between** organizations seamlessly
- **Have different permissions** in each organization

---

## Use Cases

### Scenario 1: User Owns One Organization
**Flow**: Standard onboarding → Dashboard

```
User signs up → Creates organization → Dashboard loads
```

**UI**: No organization switcher shown (only one org)

---

### Scenario 2: User Owns Multiple Organizations
**Flow**: Multiple organizations owned → Organization switcher shown

```
User A owns:
- "Acme Events" (Owner)
- "Acme Concerts" (Owner)
```

**UI**: Organization switcher dropdown in top navigation
**Behavior**: User can switch between their organizations

---

### Scenario 3: User Is Invited to Another Organization
**Flow**: Invitation email → Accept invite → Access granted → Organization switcher appears

```
User B:
- Owns "Bob's Festivals" (Owner)
- Invited to "Acme Events" (Editor)
```

**UI**: Organization switcher shows both organizations with role badges
**Permissions**:
- "Bob's Festivals" → Full access (Owner)
- "Acme Events" → Limited access (Editor role)

---

### Scenario 4: User Only Belongs to Invited Organizations
**Flow**: Invitation → No ownership → Member-only access

```
User C:
- Invited to "Acme Events" (Viewer)
- Invited to "Global Tours" (Admin)
```

**UI**: Organization switcher shows both with role badges
**Behavior**: Cannot create new organizations (no ownership)

---

## Organization Roles & Permissions

| Role | Analytics | Billing | Users | Settings | Events | Integrations |
|------|-----------|---------|-------|----------|--------|--------------|
| **Owner** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Editor** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ (Read-only) | ❌ |

### Permission Checks in Code

```typescript
// OrgDashboard.tsx
const canAccessAnalytics = () => userRole === 'owner' || userRole === 'admin' || userRole === 'editor';
const canAccessBilling = () => userRole === 'owner' || userRole === 'admin';
const canAccessUsers = () => userRole === 'owner' || userRole === 'admin';
const canAccessSecurity = () => userRole === 'owner' || userRole === 'admin';
const canAccessSettings = () => userRole === 'owner' || userRole === 'admin';
const canAccessIntegrations = () => userRole === 'owner' || userRole === 'admin';
```

---

## Implementation

### 1. Database Schema

**`organizations` table**: Stores organization info
```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
user_id UUID REFERENCES auth.users(id)  -- Owner
system_type TEXT (EVENTS | ATTRACTIONS)
```

**`organization_users` table**: Stores memberships
```sql
id UUID PRIMARY KEY
organization_id UUID REFERENCES organizations(id)
user_id UUID REFERENCES auth.users(id)
role organization_role (owner | admin | editor | viewer)
UNIQUE(organization_id, user_id)  -- User can only be in org once
```

**Key Points**:
- No limit on number of organizations per user
- User can own multiple organizations
- User can be a member of multiple organizations
- Each membership has a specific role

---

### 2. Organization Selection Logic

**`useOrganizations` hook** handles:

1. **Load all organizations**:
   ```typescript
   // Get owned organizations
   SELECT * FROM organizations WHERE user_id = current_user_id

   // Get membership organizations
   SELECT org.*, membership.role
   FROM organization_users membership
   JOIN organizations org ON org.id = membership.organization_id
   WHERE membership.user_id = current_user_id
   ```

2. **Select current organization**:
   ```typescript
   // Priority:
   // 1. Previously selected org (from localStorage)
   // 2. First organization in list
   ```

3. **Persist selection**:
   ```typescript
   localStorage.setItem('ticketflo_selected_organization', orgId);
   ```

---

### 3. Organization Switcher Component

**`OrganizationSwitcher.tsx`** displays:

- **Single organization**: Shows org name + role badge (no dropdown)
- **Multiple organizations**: Dropdown with searchable list

**Features**:
- Role badges with color coding:
  - Owner: Purple
  - Admin: Blue
  - Editor: Green
  - Viewer: Gray
- Search functionality
- Keyboard navigation
- Checkmark on selected organization

---

### 4. Integration with OrgDashboard

**Updated flow** (OrgDashboard.tsx):

```typescript
// OLD: Load first organization only
const { data, error } = await supabase
  .from("organization_users")
  .select("organization_id, role, organizations (*)")
  .eq("user_id", user.id)
  .limit(1)  // ❌ Only gets first org
  .single();

// NEW: Use hook to load all organizations
const {
  organizations,
  currentOrganization,
  switchOrganization,
} = useOrganizations();

// Display switcher in header
<OrganizationSwitcher
  organizations={organizations}
  currentOrganization={currentOrganization}
  onOrganizationChange={switchOrganization}
/>
```

---

## User Experience

### First-Time User (No Organizations)
```
1. User signs up
2. Email verification (optional)
3. OrganizationOnboarding component shown
4. User creates organization
5. Dashboard loads with their new organization
```

### Invited User (No Owned Organizations)
```
1. User receives invitation email
2. User clicks invitation link
3. User signs up / logs in
4. Organization access granted automatically
5. Dashboard loads with invited organization
```

### Multi-Organization User
```
1. User logs in
2. Dashboard loads last selected organization
3. Organization switcher visible in header
4. User can switch organizations anytime
5. Selection persists across sessions
```

---

## Navigation Flow

### Switching Organizations

When user switches organizations:

1. **Update state**: `setCurrentOrganization(newOrg)`
2. **Save preference**: `localStorage.setItem('ticketflo_selected_organization', newOrg.id)`
3. **Reload data**: Fetch events, analytics, etc. for new organization
4. **Update permissions**: Check role for new organization
5. **Update UI**: Show/hide features based on role

---

## Testing Scenarios

### Test 1: Single Organization Owner
```bash
# Setup
1. Create user A
2. User A creates "Test Events"

# Expected
- No organization switcher shown
- Full owner permissions
- Can access all features
```

### Test 2: Multiple Organization Owner
```bash
# Setup
1. Create user B
2. User B creates "Company A"
3. User B creates "Company B"

# Expected
- Organization switcher shown
- Can switch between orgs
- Full owner permissions in both
```

### Test 3: Owner + Invited Member
```bash
# Setup
1. Create user C
2. User C creates "My Events" (Owner)
3. User C invited to "Other Events" (Editor)

# Expected
- Organization switcher shown
- "My Events": Full access
- "Other Events": Limited to editing events
- Cannot access billing/users in "Other Events"
```

### Test 4: Viewer-Only Access
```bash
# Setup
1. Create user D
2. User D invited to "Big Festival" (Viewer)

# Expected
- Organization switcher shown (if multiple invites)
- Read-only access to events
- Cannot create/edit/delete events
- Cannot access analytics, billing, users, settings
```

---

## Code Files

### New Files Created
1. **`src/hooks/useOrganizations.tsx`** - Organization management hook
2. **`src/components/OrganizationSwitcher.tsx`** - UI component for switching

### Files to Update
1. **`src/pages/OrgDashboard.tsx`** - Replace manual org loading with hook
2. **`src/hooks/useAuth.tsx`** - Add `clearOrganization()` call on sign out

---

## Implementation Steps

### Step 1: Update OrgDashboard.tsx

Replace manual organization loading:

```typescript
// Remove old code (lines 178-289)
// Replace with:

const {
  organizations,
  currentOrganization,
  loading: orgLoading,
  showOnboarding,
  switchOrganization,
} = useOrganizations();

// Use currentOrganization instead of organizationId
useEffect(() => {
  if (currentOrganization) {
    if (isEventsMode()) {
      loadEvents(currentOrganization.id);
      loadAnalytics(currentOrganization.id);
    } else {
      loadAttractions(currentOrganization.id);
    }
  }
}, [currentOrganization]);
```

### Step 2: Add Organization Switcher to Header

In OrgDashboard.tsx header:

```typescript
<div className="flex items-center gap-4">
  {organizations.length > 1 && (
    <OrganizationSwitcher
      organizations={organizations}
      currentOrganization={currentOrganization}
      onOrganizationChange={switchOrganization}
    />
  )}
  <Button onClick={signOut}>Sign Out</Button>
</div>
```

### Step 3: Update Sign Out to Clear Organization

In `src/hooks/useAuth.tsx`:

```typescript
const signOut = async () => {
  // Clear organization selection
  localStorage.removeItem('ticketflo_selected_organization');

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
  }
};
```

---

## Security Considerations

### RLS Policies

Ensure Row-Level Security policies check both:
1. User owns the organization (`organizations.user_id = auth.uid()`)
2. User is a member (`organization_users.user_id = auth.uid()`)

Example policy for events:

```sql
CREATE POLICY "Users can view events in their organizations"
ON events FOR SELECT
USING (
  organization_id IN (
    -- User owns organization
    SELECT id FROM organizations WHERE user_id = auth.uid()
    UNION
    -- User is member of organization
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  )
);
```

---

## Future Enhancements

1. **Organization Creation Limits**: Restrict non-paying users to 1 organization
2. **Role-Based Invitations**: Allow editors to invite viewers (but not admins)
3. **Organization Transfer**: Transfer ownership to another user
4. **Audit Logs**: Track who switched to which organization when
5. **Recently Used**: Show recently accessed organizations first
6. **Favorites**: Pin favorite organizations to top of switcher

---

## Summary

**What's Been Created**:
- ✅ `useOrganizations` hook - Manages organization loading and switching
- ✅ `OrganizationSwitcher` component - UI for switching organizations
- ✅ Role-based permission system - Already exists in OrgDashboard
- ✅ Multi-membership support - Database schema supports it

**What Needs Integration**:
- Update OrgDashboard.tsx to use the new hook
- Add OrganizationSwitcher to the dashboard header
- Update sign out to clear organization selection
- Test all scenarios

Once integrated, users will be able to:
- Belong to multiple organizations
- Switch between them seamlessly
- Have different roles/permissions in each
- Enjoy a smooth, persistent experience
