#!/bin/bash

# Script to update Botpress favicon with your blue chatbot icon
# Usage: ./update-favicon.sh path/to/your/blue-chatbot-icon.png

if [ $# -eq 0 ]; then
    echo "Usage: $0 <xmati.png>"
    echo "Example: $0 ./xmati.png"
    exit 1
fi

ICON_PATH=$1

if [ ! -f "$ICON_PATH" ]; then
    echo "Error: File $ICON_PATH not found!"
    exit 1
fi

echo "Updating Botpress favicon with your blue chatbot icon..."

# Main favicon for the application (878x878 PNG)
echo "Updating main favicon..."
cp "$ICON_PATH" packages/bp/dist/data/assets/studio/ui/public/img/xmati.png

# Admin UI favicon (ICO format)
echo "Updating admin UI favicon..."
if command -v convert >/dev/null 2>&1; then
    # If ImageMagick is available, convert to ICO
    convert "$ICON_PATH" -resize 32x32 packages/ui-admin/public/favicon.ico
    convert "$ICON_PATH" -resize 32x32 docs/static/img/favicon.ico
else
    # If no ImageMagick, just copy the PNG (browsers will handle it)
    cp "$ICON_PATH" packages/ui-admin/public/favicon.png
    echo "Note: ImageMagick not found. Copied as PNG. Install ImageMagick for ICO conversion."
fi

# Update source images (optional but recommended for consistency)
echo "Updating source images..."
cp "$ICON_PATH" packages/ui-admin/src/assets/images/xmati.png
cp "$ICON_PATH" packages/ui-admin/src/app/routes/xmati.png
cp "$ICON_PATH" packages/ui-admin/src/app/Menu/xmati.png
cp "$ICON_PATH" packages/ui-admin/src/auth/media/xmati.png
cp "$ICON_PATH" modules/channel-web/assets/images/xmati.png

echo "✅ Favicon updated successfully!"
echo ""
echo "Next steps:"
echo "1. Rebuild the project: cd packages/bp && yarn build"
echo "2. Restart your Botpress server"
echo "3. Clear browser cache to see the new favicon"
echo ""
echo "Your blue chatbot icon should now appear in browser tabs!"