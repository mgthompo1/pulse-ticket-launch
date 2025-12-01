// Apple Wallet Signing Routes for ES modules
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Import node-forge at module level to avoid runtime issues
let forge;
try {
  forge = require('node-forge');
} catch (e) {
  console.error('Failed to load node-forge:', e.message);
}

export function addAppleWalletRoutes(app) {

  // Apple Wallet signing endpoint
  app.post('/api/apple-wallet/sign', async (req, res) => {
    try {
      console.log('🔐 Apple Wallet signing request received');

      const { manifestJson, cert, password, apiKey } = req.body;

      // Basic API key validation
      const expectedApiKey = process.env.APPLE_WALLET_SIGNING_API_KEY;
      if (expectedApiKey && apiKey !== expectedApiKey) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      // Validate required fields
      if (!manifestJson || !cert) {
        return res.status(400).json({
          error: 'Missing required fields: manifestJson, cert'
        });
      }

      console.log('📝 Creating signature for Apple Wallet manifest...');
      console.log('🔍 Certificate data analysis:');
      console.log('- cert type:', typeof cert);
      console.log('- cert length:', cert?.length || 'undefined');
      console.log('- cert starts with:', cert?.substring(0, 50) || 'undefined');
      console.log('- cert ends with:', cert?.substring(cert.length - 50) || 'undefined');
      console.log('- password provided:', !!password);

      // Create temporary directory
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const timestamp = Date.now();
      const manifestFile = path.join(tempDir, `manifest_${timestamp}.json`);
      const signatureFile = path.join(tempDir, `signature_${timestamp}`);

      try {
        // Write manifest to temporary file
        fs.writeFileSync(manifestFile, manifestJson);

        console.log('🔧 Processing certificate with node-forge...');

        if (!forge) {
          throw new Error('node-forge not available');
        }

        // Extract certificate and private key from P12 using node-forge
        console.log('🔧 Decoding base64 certificate...');
        const p12Der = forge.util.decode64(cert);
        console.log('- p12Der length:', p12Der.length);
        console.log('- p12Der type:', typeof p12Der);

        console.log('🔧 Parsing ASN.1 structure...');
        const p12Asn1 = forge.asn1.fromDer(p12Der);

        console.log('🔧 Extracting PKCS#12...');
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password || '');

        // Get certificate and private key
        const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
        const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

        const certificate = certBags[forge.pki.oids.certBag][0].cert;
        const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;

        // Convert to PEM format for OpenSSL
        const certPem = forge.pki.certificateToPem(certificate);
        const keyPem = forge.pki.privateKeyToPem(privateKey);

        const certPemFile = path.join(tempDir, `cert_${timestamp}.pem`);
        const keyPemFile = path.join(tempDir, `key_${timestamp}.pem`);

        fs.writeFileSync(certPemFile, certPem);
        fs.writeFileSync(keyPemFile, keyPem);

        // Download Apple WWDR certificate
        const wwdrFile = path.join(tempDir, `wwdr_${timestamp}.cer`);
        try {
          const wwdrResponse = await fetch('https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer');
          if (wwdrResponse.ok) {
            const wwdrBuffer = Buffer.from(await wwdrResponse.arrayBuffer());
            fs.writeFileSync(wwdrFile, wwdrBuffer);
            console.log('✅ Downloaded Apple WWDR certificate');
          }
        } catch (e) {
          console.warn('⚠️ Could not download WWDR certificate:', e.message);
        }

        // Create OpenSSL command with proper CMS structure and signingTime
        const opensslCmd = [
          'openssl cms',
          '-sign',
          '-binary',
          '-nodetach',
          `-in "${manifestFile}"`,
          `-out "${signatureFile}"`,
          `-inkey "${keyPemFile}"`,
          `-signer "${certPemFile}"`,
          fs.existsSync(wwdrFile) ? `-certfile "${wwdrFile}"` : '',
          '-outform DER',
          '-nosmimecap'
        ].filter(Boolean).join(' ');

        console.log('🔨 Executing OpenSSL signing...');
        execSync(opensslCmd, { stdio: 'pipe' });

        // Read the signature
        if (!fs.existsSync(signatureFile)) {
          throw new Error('OpenSSL failed to create signature file');
        }

        const signature = fs.readFileSync(signatureFile);
        console.log(`✅ Apple Wallet signature created: ${signature.length} bytes`);

        // Validate signature size (proper PKCS#7 should be much larger than 32 bytes)
        if (signature.length < 100) {
          throw new Error(`Signature too small: ${signature.length} bytes (expected > 100)`);
        }

        // Return success response
        res.json({
          success: true,
          signature: signature.toString('base64'),
          size: signature.length,
          timestamp: new Date().toISOString()
        });

      } finally {
        // Clean up temporary files
        const filesToClean = [
          manifestFile,
          signatureFile,
          path.join(tempDir, `cert_${timestamp}.pem`),
          path.join(tempDir, `key_${timestamp}.pem`),
          path.join(tempDir, `wwdr_${timestamp}.cer`)
        ];

        filesToClean.forEach(file => {
          try {
            if (fs.existsSync(file)) {
              fs.unlinkSync(file);
            }
          } catch (e) {
            console.warn(`Could not delete temp file ${file}:`, e.message);
          }
        });
      }

    } catch (error) {
      console.error('❌ Apple Wallet signing error:', error);
      res.status(500).json({
        error: 'Apple Wallet signature creation failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Apple Wallet health check endpoint
  app.get('/api/apple-wallet/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'apple-wallet-signer',
      timestamp: new Date().toISOString(),
      openssl_available: true
    });
  });

}