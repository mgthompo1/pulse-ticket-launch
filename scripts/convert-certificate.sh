#!/bin/bash

# Certificate Conversion Script
echo "🔄 Converting Apple Wallet Certificate"
echo "====================================="

# Check for downloaded certificate
CERT_FILE=""
for file in *.cer; do
    if [ -f "$file" ]; then
        CERT_FILE="$file"
        break
    fi
done

if [ -z "$CERT_FILE" ]; then
    echo "❌ No .cer file found. Please download your certificate from Apple Developer Console first."
    echo ""
    echo "Steps:"
    echo "1. Go to Apple Developer Console → Certificates"
    echo "2. Find your Pass Type ID Certificate"
    echo "3. Download the .cer file"
    echo "4. Place it in this directory"
    echo "5. Run this script again"
    exit 1
fi

echo "✅ Found certificate: $CERT_FILE"

# Convert certificate to PEM format
echo "🔄 Converting to PEM format..."
openssl x509 -inform DER -outform PEM -in "$CERT_FILE" -out apple_wallet_cert.pem

if [ $? -ne 0 ]; then
    echo "❌ Failed to convert certificate to PEM format"
    exit 1
fi

echo "✅ Converted to PEM format"

# Create .p12 file
echo "🔄 Creating .p12 certificate..."
echo "You'll be prompted to set a password for the .p12 file."
echo "Remember this password - you'll need it for the environment variables!"
echo ""

openssl pkcs12 -export -in apple_wallet_cert.pem -inkey apple_wallet_private.key -out apple_wallet.p12 -name "Apple Wallet Certificate"

if [ $? -ne 0 ]; then
    echo "❌ Failed to create .p12 certificate"
    exit 1
fi

echo "✅ Created .p12 certificate"

# Create base64 encoded version
echo "🔄 Creating base64 encoded version..."
base64 -i apple_wallet.p12 -o apple_wallet_base64.txt

echo "✅ Base64 encoded certificate created"
echo ""

echo "📋 Environment Variables for Supabase:"
echo "====================================="
echo ""
echo "Add these to your Supabase Edge Function environment:"
echo ""
echo "APPLE_TEAM_ID=YOUR_TEAM_ID"
echo "APPLE_PASS_TYPE_ID=pass.com.yourdomain.ticketflo.eventticket"
echo "APPLE_WALLET_CERT_P12=$(cat apple_wallet_base64.txt | tr -d '\n')"
echo "APPLE_WALLET_CERT_PASSWORD=<password_you_just_set>"
echo ""

echo "🔍 To find your Team ID:"
echo "1. Go to Apple Developer Console"
echo "2. Click your name in top right"
echo "3. View Membership → Team ID"
echo ""

echo "📁 Files created:"
echo "   • apple_wallet_cert.pem (PEM certificate)"
echo "   • apple_wallet.p12 (PKCS#12 certificate)"
echo "   • apple_wallet_base64.txt (Base64 encoded for environment)"
echo ""

echo "🗑️  Cleanup:"
echo "   You can delete the original .cer file and apple_wallet_cert.pem"
echo "   Keep apple_wallet.p12 and apple_wallet_base64.txt for deployment"
echo ""

echo "✅ Certificate conversion complete!"
echo "   Next: Set up environment variables in Supabase and deploy"