# Apple Pay & Google Pay Setup Guide (Stripe Integration)

## 🎯 Overview

This setup uses **Stripe's built-in Apple Pay and Google Pay support**, which eliminates the need for:
- Manual Apple Developer account setup
- Domain verification files
- Separate merchant IDs
- Complex API integrations

## 🍎 Apple Pay Setup (via Stripe)

### 1. Enable in Stripe Dashboard
1. Log into your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Go to **Settings** → **Payment methods**
3. Find **Apple Pay** and click **Configure**
4. Add your domain(s) to the allowed domains list
5. Stripe will automatically handle domain verification

### 2. Enable in Your App
1. Go to Payment Configuration in your dashboard
2. Select **Stripe** as payment provider
3. Toggle **Apple Pay** to ON
4. That's it! Stripe handles the rest

---

## 🤖 Google Pay Setup (via Stripe)

### 1. Enable in Stripe Dashboard
1. In your Stripe Dashboard, go to **Settings** → **Payment methods**
2. Find **Google Pay** and click **Configure**
3. Stripe automatically handles Google Pay setup

### 2. Enable in Your App
1. Go to Payment Configuration in your dashboard
2. Select **Stripe** as payment provider
3. Toggle **Google Pay** to ON
4. No additional configuration needed

---

## 🚀 What Happens Next

### Stripe Automatically:
- ✅ Configures Apple Pay domain verification
- ✅ Manages Apple Pay merchant IDs
- ✅ Sets up Google Pay integration
- ✅ Handles compliance and security
- ✅ Provides payment method detection
- ✅ Manages payment processing

### You Just Need To:
- ✅ Enable the toggles in your dashboard
- ✅ Ensure your domain is added to Stripe's allowed domains
- ✅ Test the payment flow

---

## 🧪 Testing

### Test Apple Pay:
1. Use Safari browser (Apple Pay only works in Safari)
2. Navigate to your ticket widget
3. Verify Apple Pay button appears automatically
4. Complete a test payment

### Test Google Pay:
1. Use Chrome browser
2. Navigate to your ticket widget
3. Verify Google Pay button appears automatically
4. Complete a test payment

---

## 🔧 Stripe Configuration Requirements

### In Stripe Dashboard:
- Apple Pay enabled and domain added
- Google Pay enabled
- Account in good standing
- Proper webhook endpoints configured

### In Your App:
- Stripe publishable key configured
- Payment method detection enabled
- Proper error handling

---

## 🚨 Common Issues & Solutions

### Apple Pay not showing:
- **Check browser**: Apple Pay only works in Safari
- **Verify domain**: Ensure domain is added to Stripe's Apple Pay allowed list
- **Check Stripe status**: Verify Apple Pay is enabled in Stripe dashboard

### Google Pay not showing:
- **Check browser**: Use Chrome or other supported browsers
- **Verify Stripe setup**: Ensure Google Pay is enabled in Stripe dashboard
- **Check device**: Google Pay requires supported Android device or Chrome on desktop

### Payment methods not detected:
- **Verify Stripe keys**: Check publishable key is correct
- **Check domain**: Ensure you're testing on the domain configured in Stripe
- **Check console**: Look for any JavaScript errors

---

## 📞 Support

### Stripe Support:
- [Stripe Apple Pay Documentation](https://stripe.com/docs/apple-pay)
- [Stripe Google Pay Documentation](https://stripe.com/docs/google-pay)
- [Stripe Support](https://support.stripe.com/)

### Your App Issues:
1. Check browser console for errors
2. Verify Stripe configuration in dashboard
3. Test with Stripe's test cards
4. Check Stripe dashboard for any account issues

---

## 🎉 Benefits of Stripe Integration

- **No manual setup** required
- **Automatic compliance** with payment standards
- **Built-in security** and fraud protection
- **Easy testing** with Stripe's test environment
- **Automatic updates** when payment standards change
- **Professional support** from Stripe team
