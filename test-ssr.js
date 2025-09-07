#!/usr/bin/env node

/**
 * Simple test script to verify hybrid SSR functionality
 */

import { render } from './dist/server/server.js';

console.log('🧪 Testing Hybrid SSR Implementation\n');

// Test cases
const testCases = [
  {
    name: 'Landing Page (should SSR)',
    url: '/',
    expectedSSR: true
  },
  {
    name: 'Event Page (should SSR)',
    url: '/events/123',
    expectedSSR: true
  },
  {
    name: 'Contact Page (should SSR)',
    url: '/contact',
    expectedSSR: true
  },
  {
    name: 'Dashboard (should be SPA)',
    url: '/dashboard',
    expectedSSR: false
  },
  {
    name: 'Admin (should be SPA)',
    url: '/admin',
    expectedSSR: false
  },
  {
    name: 'Auth (should be SPA)',
    url: '/auth',
    expectedSSR: false
  }
];

// Test with regular user agent
console.log('📱 Testing with regular user agent:');
testCases.forEach(testCase => {
  try {
    const result = render(testCase.url, {
      url: testCase.url,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      isBot: false
    });
    
    const status = result.shouldSSR === testCase.expectedSSR ? '✅' : '❌';
    console.log(`${status} ${testCase.name}: SSR=${result.shouldSSR} (expected: ${testCase.expectedSSR})`);
  } catch (error) {
    console.log(`❌ ${testCase.name}: Error - ${error.message}`);
  }
});

console.log('\n🤖 Testing with bot user agent:');
testCases.forEach(testCase => {
  try {
    const result = render(testCase.url, {
      url: testCase.url,
      userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      isBot: true
    });
    
    // Bots should always get SSR
    const status = result.shouldSSR ? '✅' : '❌';
    console.log(`${status} ${testCase.name}: SSR=${result.shouldSSR} (bots should always get SSR)`);
  } catch (error) {
    console.log(`❌ ${testCase.name}: Error - ${error.message}`);
  }
});

console.log('\n🎯 Hybrid SSR Test Complete!');
console.log('📝 Summary:');
console.log('   • Public pages (/, /events, /contact) → SSR for SEO');
console.log('   • Dashboard/admin pages → SPA for performance');
console.log('   • Bots/crawlers → Always SSR for SEO');
console.log('   • Regular users → Hybrid based on route');
