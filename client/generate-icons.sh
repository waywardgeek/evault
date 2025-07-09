#!/bin/bash

# Script to generate PNG icons from SVG for eVaultApp PWA
# Requires ImageMagick (install with: sudo apt-get install imagemagick)

echo "🎨 Generating PNG icons from SVG..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is not installed. Please install it first:"
    echo "   Ubuntu/Debian: sudo apt-get install imagemagick"
    echo "   macOS: brew install imagemagick"
    echo "   Or use online tools like: https://convertio.co/svg-png/"
    exit 1
fi

# Generate PNG files from SVG
echo "🔄 Converting icon.svg to PNG files..."

# Generate 180x180 for Apple Touch Icon
convert public/icon.svg -resize 180x180 -background transparent public/apple-touch-icon.png
echo "✅ Created apple-touch-icon.png (180x180)"

# Generate 192x192 for Android
convert public/icon.svg -resize 192x192 -background transparent public/icon-192x192.png
echo "✅ Created icon-192x192.png (192x192)"

# Generate 512x512 for Android
convert public/icon.svg -resize 512x512 -background transparent public/icon-512x512.png
echo "✅ Created icon-512x512.png (512x512)"

# Generate favicon.ico (32x32)
convert public/icon.svg -resize 32x32 -background transparent public/favicon.ico
echo "✅ Created favicon.ico (32x32)"

# Generate additional sizes for better PWA support
convert public/icon.svg -resize 144x144 -background transparent public/icon-144x144.png
echo "✅ Created icon-144x144.png (144x144)"

convert public/icon.svg -resize 96x96 -background transparent public/icon-96x96.png
echo "✅ Created icon-96x96.png (96x96)"

convert public/icon.svg -resize 72x72 -background transparent public/icon-72x72.png
echo "✅ Created icon-72x72.png (72x72)"

convert public/icon.svg -resize 48x48 -background transparent public/icon-48x48.png
echo "✅ Created icon-48x48.png (48x48)"

echo "🎉 All icon files generated successfully!"
echo "📱 Your PWA will now have a proper vault icon when added to home screen!" 