const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  console.log('🎨 Generating PNG icons from SVG...');
  
  const svgPath = path.join(__dirname, 'public', 'icon.svg');
  const publicDir = path.join(__dirname, 'public');
  
  if (!fs.existsSync(svgPath)) {
    console.error('❌ icon.svg not found in public directory');
    return;
  }
  
  const icons = [
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-512x512.png', size: 512 },
    { name: 'favicon.ico', size: 32 },
    { name: 'icon-144x144.png', size: 144 },
    { name: 'icon-96x96.png', size: 96 },
    { name: 'icon-72x72.png', size: 72 },
    { name: 'icon-48x48.png', size: 48 }
  ];
  
  try {
    for (const icon of icons) {
      const outputPath = path.join(publicDir, icon.name);
      
      await sharp(svgPath)
        .resize(icon.size, icon.size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Created ${icon.name} (${icon.size}x${icon.size})`);
    }
    
    console.log('🎉 All icon files generated successfully!');
    console.log('📱 Your PWA will now have a proper vault icon when added to home screen!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
  }
}

generateIcons(); 