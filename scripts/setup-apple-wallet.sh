#!/bin/bash

# Apple Wallet Setup Script for TicketFlo
echo "🍎 Apple Wallet Integration Setup"
echo "================================="

# Check if files exist
if [ ! -f "apple_wallet_private.key" ] || [ ! -f "apple_wallet.csr" ]; then
    echo "❌ Missing certificate files. Please run the OpenSSL commands first."
    exit 1
fi

echo "✅ Certificate files found"
echo ""

echo "📋 Next steps:"
echo ""
echo "1. 🌐 Go to Apple Developer Console:"
echo "   https://developer.apple.com/account/resources/identifiers/list/passTypeId"
echo ""
echo "2. ➕ Create Pass Type ID:"
echo "   • Click '+' to add new Pass Type ID"
echo "   • Identifier: pass.com.yourdomain.ticketflo.eventticket"
echo "   • Description: TicketFlo Event Tickets"
echo "   • Register the Pass Type ID"
echo ""
echo "3. 🔐 Create Certificate:"
echo "   • Go to Certificates section"
echo "   • Click '+' → 'Pass Type ID Certificate'"
echo "   • Select your Pass Type ID"
echo "   • Upload this file: $(pwd)/apple_wallet.csr"
echo "   • Download the certificate (.cer file)"
echo ""
echo "4. 🔄 Convert Certificate:"
echo "   • Place downloaded .cer file in this directory"
echo "   • Run: ./convert-certificate.sh"
echo ""
echo "5. 🚀 Deploy to Supabase:"
echo "   • Set environment variables in Supabase Dashboard"
echo "   • Deploy the updated Edge Function"
echo "   • Test on iOS device"
echo ""

echo "📁 Files ready for upload:"
echo "   • CSR file: $(pwd)/apple_wallet.csr"
echo "   • Private key (keep secure): $(pwd)/apple_wallet_private.key"
echo ""

echo "⚠️  Security Note:"
echo "   Keep apple_wallet_private.key secure and never commit to git!"

# Add to .gitignore if it exists
if [ -f ".gitignore" ]; then
    if ! grep -q "apple_wallet_private.key" .gitignore; then
        echo "apple_wallet_private.key" >> .gitignore
        echo "✅ Added private key to .gitignore"
    fi
fi

echo ""
echo "🔗 Useful Links:"
echo "   • Apple Developer Console: https://developer.apple.com/account/"
echo "   • Pass Type IDs: https://developer.apple.com/account/resources/identifiers/list/passTypeId"
echo "   • Certificates: https://developer.apple.com/account/resources/certificates/list"
echo "   • Wallet Developer Guide: https://developer.apple.com/documentation/walletpasses"