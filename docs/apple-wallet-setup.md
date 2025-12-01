# Apple Wallet Integration Setup Guide

## Step 1: Create Certificate Signing Request (CSR)

Run these commands on your Mac:

```bash
# Create a private key
openssl genrsa -out apple_wallet_private.key 2048

# Create a certificate signing request
openssl req -new -key apple_wallet_private.key -out apple_wallet.csr -subj "/C=US/ST=State/L=City/O=YourCompany/OU=IT/CN=Apple Wallet Pass Certificate"
```

## Step 2: Apple Developer Console Setup

1. Go to [Apple Developer Console](https://developer.apple.com/account/)
2. **Certificates, Identifiers & Profiles** → **Identifiers** → **+**
3. Select **Pass Type IDs**
4. Create identifier: `pass.com.yourdomain.ticketflo.eventticket`
   - Replace `yourdomain` with your actual domain
5. **Register** the Pass Type ID

## Step 3: Generate Apple Wallet Certificate

1. **Certificates** → **+** → **Pass Type ID Certificate**
2. Select your Pass Type ID
3. Upload the `apple_wallet.csr` file created above
4. **Download** the certificate (.cer file)
5. Convert to .p12 format:

```bash
# Convert the downloaded certificate to .pem
openssl x509 -inform DER -outform PEM -in apple_wallet_certificate.cer -out apple_wallet_cert.pem

# Create .p12 file (you'll be asked to set a password)
openssl pkcs12 -export -in apple_wallet_cert.pem -inkey apple_wallet_private.key -out apple_wallet.p12 -name "Apple Wallet Certificate"
```

## Step 4: Environment Variables

Add these to your Supabase Edge Function environment:

```bash
# Your Apple Developer Team ID (found in Apple Developer Console)
APPLE_TEAM_ID=YOUR_TEAM_ID

# Your registered Pass Type ID
APPLE_PASS_TYPE_ID=pass.com.yourdomain.ticketflo.eventticket

# Base64 encoded .p12 certificate
APPLE_WALLET_CERT_P12=<base64_encoded_p12_file>

# Password for the .p12 certificate
APPLE_WALLET_CERT_PASSWORD=your_password
```

To get the base64 encoded certificate:
```bash
base64 -i apple_wallet.p12 -o apple_wallet_base64.txt
```

## Step 5: Test Your Setup

Once configured, test with a ticket code:
```bash
curl "YOUR_SUPABASE_URL/functions/v1/generate-apple-wallet-pass?ticketCode=TICKET_CODE"
```

## Next Steps

1. Complete the Apple Developer setup
2. Update the Supabase environment variables
3. Deploy the updated Edge Function
4. Test on a real iOS device