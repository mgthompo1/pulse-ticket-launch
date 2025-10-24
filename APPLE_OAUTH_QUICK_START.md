# Apple OAuth Quick Start Guide

## Prerequisites
- Apple Developer Account ($99/year)
- Access to https://developer.apple.com/account

---

## Step 1: Create App ID

1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Click **+** button
3. Select **App IDs** → Continue
4. Select **App** → Continue
5. Fill in:
   - **Description**: TicketFlo
   - **Bundle ID**: `com.ticketflo.app` (or use your existing domain reversed)
   - **Capabilities**: Check ✓ **Sign In with Apple**
6. Click **Continue** → **Register**

---

## Step 2: Create Service ID (This is your Client ID)

1. Go back to Identifiers page
2. Click **+** button
3. Select **Services IDs** → Continue
4. Fill in:
   - **Description**: TicketFlo Web Auth
   - **Identifier**: `com.ticketflo.auth` ← **This is your Client ID for Supabase!**
   - Check ✓ **Sign In with Apple**
5. Click **Continue** → **Register**
6. Click on the newly created Service ID
7. Click **Configure** next to Sign In with Apple
8. Configure:
   - **Primary App ID**: Select `com.ticketflo.app` (from Step 1)
   - **Website URLs**:
     - **Domains**: `yoxsewbpoqxscsutqlcb.supabase.co`
     - **Return URLs**: `https://yoxsewbpoqxscsutqlcb.supabase.co/auth/v1/callback`
9. Click **Save** → **Continue** → **Done**

---

## Step 3: Create Private Key

1. Go to **Keys** in left sidebar
2. Click **+** button
3. Fill in:
   - **Key Name**: TicketFlo Apple Sign In Key
   - Check ✓ **Sign In with Apple**
   - Click **Configure**
   - Select **Primary App ID**: `com.ticketflo.app`
   - Click **Save**
4. Click **Continue** → **Register**
5. **IMPORTANT**: Download the `.p8` file (you can only download once!)
6. Save the **Key ID** shown (e.g., `ABC123DEFG`)

---

## Step 4: Get Your Team ID

1. Go to https://developer.apple.com/account
2. Your **Team ID** is in the top right corner (e.g., `XYZ9876543`)
3. Copy it

---

## Step 5: Configure in Supabase

Now you have everything you need! Go back to Supabase and fill in:

1. **Client IDs**: `com.ticketflo.auth` (from Step 2)

2. **Secret Key**: Open the `.p8` file you downloaded and copy the ENTIRE contents:
   ```
   -----BEGIN PRIVATE KEY-----
   MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
   (multiple lines)
   ...
   -----END PRIVATE KEY-----
   ```

3. Click **Save**

---

## Step 6: Test

1. Go to https://ticketflo.com/auth
2. Click "Continue with Apple"
3. You should see Apple's sign-in screen
4. After signing in, you should be redirected to /dashboard

---

## Troubleshooting

**Error: "invalid_client"**
- Double-check Service ID matches exactly
- Verify Secret Key includes header and footer

**Error: "redirect_uri_mismatch"**
- Make sure return URL in Apple Console matches exactly:
  `https://yoxsewbpoqxscsutqlcb.supabase.co/auth/v1/callback`

**Can't find Team ID**
- It's in the top right of https://developer.apple.com/account

---

## Summary - What You Need

Copy these values to Supabase:

```
Client IDs: com.ticketflo.auth
Secret Key: (contents of .p8 file)
```

That's it! Save and test.
