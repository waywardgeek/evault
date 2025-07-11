const jwt = require('jsonwebtoken');
const fs = require('fs');

// Replace these values with your actual Apple Developer credentials
const teamId = 'B2SUY7SU9A';        // Your Team ID from Apple Developer
const keyId = '4S892A36WV';          // Your Key ID from the downloaded key
const serviceId = 'com.evaultapp.web'; // Your Service ID from Step 2
const privateKeyFile = './AuthKey_4S892A36WV.p8'; // Your downloaded .p8 file

try {
  // Read the private key file
  const privateKey = fs.readFileSync(privateKeyFile, 'utf8');
  
  // Generate the JWT token
  const token = jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    expiresIn: '1y',           // Token valid for 1 year
    audience: 'https://appleid.apple.com',
    issuer: teamId,
    subject: serviceId,
    keyid: keyId
  });

  console.log('\n🍎 Apple Sign In Credentials Generated!\n');
  console.log('Add these to your environment variables:');
  console.log('=====================================');
  console.log(`APPLE_ID=${serviceId}`);
  console.log(`APPLE_SECRET=${token}`);
  console.log('\n✅ Copy these values to your Vercel environment variables');
  
} catch (error) {
  console.error('\n❌ Error generating Apple secret:', error.message);
  console.log('\nMake sure:');
  console.log('1. Your .p8 file is in the current directory');
  console.log('2. You\'ve updated the script with your actual values');
  console.log('3. The file path matches your Key ID');
} 
