#!/bin/bash

# Migration script for send-ticket-email Edge function refactor
# This script helps migrate from the monolithic to modular architecture

echo "🚀 Starting send-ticket-email Edge function migration..."

# Check if we're in the right directory
if [[ ! -f "index.ts" || ! -f "index-refactored.ts" ]]; then
    echo "❌ Error: Please run this script from the send-ticket-email function directory"
    exit 1
fi

# Create backup of original file
echo "📦 Creating backup of original index.ts..."
cp index.ts index-original-backup.ts

# Deployment options
echo ""
echo "Choose migration strategy:"
echo "1. Safe migration (deploy as new function for testing)"
echo "2. Direct replacement (replace existing function)"
echo ""
read -p "Enter your choice (1 or 2): " choice

case $choice in
    1)
        echo "🔄 Safe migration selected..."
        echo "This will create a new function 'send-ticket-email-v2' for testing"
        echo "You can test it alongside the existing function"
        
        # Create v2 directory structure
        cd ../
        mkdir -p send-ticket-email-v2
        cd send-ticket-email-v2
        
        # Copy all refactored files
        cp ../send-ticket-email/index-refactored.ts ./index.ts
        cp ../send-ticket-email/types.ts ./
        cp ../send-ticket-email/config.ts ./
        cp ../send-ticket-email/utils.ts ./
        cp ../send-ticket-email/database.ts ./
        cp ../send-ticket-email/payment.ts ./
        cp ../send-ticket-email/templates.ts ./
        
        echo "✅ New function created at send-ticket-email-v2/"
        echo "📝 To deploy: supabase functions deploy send-ticket-email-v2"
        echo "🧪 Test with: supabase functions invoke send-ticket-email-v2 --body '{\"orderId\":\"test-order-id\"}'"
        ;;
        
    2)
        echo "⚠️  Direct replacement selected..."
        echo "This will replace the existing function immediately"
        read -p "Are you sure? This will affect production traffic (y/N): " confirm
        
        if [[ $confirm == "y" || $confirm == "Y" ]]; then
            echo "🔄 Replacing index.ts with refactored version..."
            mv index-refactored.ts index.ts
            
            echo "✅ Function replaced successfully!"
            echo "📝 To deploy: supabase functions deploy send-ticket-email"
            echo "⚠️  Make sure to test thoroughly before deploying to production"
        else
            echo "❌ Migration cancelled"
            exit 0
        fi
        ;;
        
    *)
        echo "❌ Invalid choice. Migration cancelled."
        exit 1
        ;;
esac

echo ""
echo "🎉 Migration completed!"
echo ""
echo "📚 Next steps:"
echo "1. Review the generated files"
echo "2. Test the function with sample data"
echo "3. Deploy to staging environment first"
echo "4. Monitor logs and performance"
echo "5. Gradually migrate production traffic"
echo ""
echo "📖 See EDGE_FUNCTION_IMPROVEMENTS.md for detailed documentation"
