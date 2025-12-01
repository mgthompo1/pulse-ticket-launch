/**
 * Generate Apple OAuth JWT Secret for Supabase
 *
 * This script generates the JWT token that Supabase needs for Apple OAuth.
 * Apple requires you to regenerate this every 6 months.
 */

const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');

// Your Apple OAuth credentials
const TEAM_ID = 'DA3U3FH5FZ';
const KEY_ID = 'U83K8VM2DX';
const CLIENT_ID = 'com.ticketflo.auth'; // Your Services ID

// Path to your .p8 file
const P8_FILE_PATH = path.join(process.env.HOME, 'Downloads', 'AuthKey_U83K8VM2DX.p8');

try {
  // Read the private key
  const privateKey = fs.readFileSync(P8_FILE_PATH, 'utf8');

  // JWT payload
  const payload = {
    iss: TEAM_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (86400 * 180), // 180 days (6 months)
    aud: 'https://appleid.apple.com',
    sub: CLIENT_ID,
  };

  // JWT header
  const header = {
    alg: 'ES256',
    kid: KEY_ID,
  };

  // Generate the JWT
  const token = jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    header: header,
  });

  console.log('\n✅ Apple OAuth JWT Generated Successfully!\n');
  console.log('=================================================');
  console.log('Copy this JWT and paste it into Supabase:');
  console.log('=================================================\n');
  console.log(token);
  console.log('\n=================================================');
  console.log('⚠️  IMPORTANT:');
  console.log('- This JWT expires in 6 months');
  console.log('- Set a reminder to regenerate it before expiration');
  console.log('- Paste this into the "Secret Key (for OAuth)" field');
  console.log('=================================================\n');

  // Save to file as well
  const outputFile = path.join(__dirname, 'APPLE_JWT_SECRET.txt');
  const output = `Apple OAuth JWT Secret
Generated: ${new Date().toISOString()}
Expires: ${new Date(Date.now() + (86400 * 180 * 1000)).toISOString()}

Team ID: ${TEAM_ID}
Key ID: ${KEY_ID}
Client ID: ${CLIENT_ID}

JWT Token (paste this into Supabase):
${token}

⚠️  IMPORTANT:
- This JWT expires in 6 months
- Set a reminder to regenerate it: ${new Date(Date.now() + (86400 * 180 * 1000)).toLocaleDateString()}
- Keep this file secure - treat it like a password
`;

  fs.writeFileSync(outputFile, output);
  console.log(`✅ JWT also saved to: ${outputFile}\n`);

} catch (error) {
  console.error('❌ Error generating JWT:', error.message);

  if (error.code === 'ENOENT') {
    console.error('\n💡 Could not find .p8 file at:', P8_FILE_PATH);
    console.error('Make sure the file exists in your Downloads folder.\n');
  } else if (error.message.includes('jsonwebtoken')) {
    console.error('\n💡 Missing required package. Run this first:');
    console.error('npm install jsonwebtoken\n');
  } else {
    console.error('\nFull error:', error);
  }

  process.exit(1);
}
