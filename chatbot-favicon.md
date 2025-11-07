# Update Favicon with Blue Chatbot Icon

## Steps to replace the favicon with your blue chatbot icon:

### 1. Save your blue chatbot icon
Save the blue chatbot icon image as `blue-chatbot-icon.png` in the root directory of your project.

### 2. Replace the existing favicon files

You need to replace the favicon in these locations:

#### Main favicon locations:
- `/packages/bp/dist/data/assets/studio/ui/public/img/xmati.png` (Current: 878x878 PNG)
- `/packages/ui-admin/public/favicon.ico`

#### Optional: Also update these for consistency:
- `/docs/static/img/favicon.ico`
- `/packages/ui-admin/src/assets/images/xmati.png` 
- `/packages/ui-admin/src/app/routes/xmati.png`
- `/packages/ui-admin/src/app/Menu/xmati.png`
- `/packages/ui-admin/src/auth/media/xmati.png`
- `/modules/channel-web/assets/images/xmati.png`

### 3. Convert and resize the image

Your blue chatbot icon should be converted to:
- PNG format (878x878) for `/packages/bp/dist/data/assets/studio/ui/public/img/xmati.png`
- ICO format (multiple sizes: 16x16, 32x32, 48x48) for `favicon.ico` files

### 4. Commands to execute:

```bash
# After saving your blue chatbot icon as blue-chatbot-icon.png in the project root

# Convert to different sizes and formats
# (You'll need ImageMagick or similar tool installed)

# Create the main PNG favicon (878x878)
convert blue-chatbot-icon.png -resize 878x878 packages/bp/dist/data/assets/studio/ui/public/img/xmati.png

# Create ICO favicon with multiple sizes
convert blue-chatbot-icon.png -resize 256x256 -density 256x256 packages/ui-admin/public/favicon.ico
convert blue-chatbot-icon.png -resize 256x256 -density 256x256 docs/static/img/favicon.ico

# Update other PNG locations (optional)
cp blue-chatbot-icon.png packages/ui-admin/src/assets/images/xmati.png
cp blue-chatbot-icon.png packages/ui-admin/src/app/routes/xmati.png
cp blue-chatbot-icon.png packages/ui-admin/src/app/Menu/xmati.png
cp blue-chatbot-icon.png packages/ui-admin/src/auth/media/xmati.png
cp blue-chatbot-icon.png modules/channel-web/assets/images/xmati.png
```

### 5. Rebuild the project

After replacing the files, rebuild your project:

```bash
cd packages/bp
yarn build
```

### 6. Verify the changes

- The browser tab should now show your blue chatbot icon
- Check all admin panels, studio, and webchat interfaces
- Clear browser cache if needed to see the changes

## Configuration Details

The favicon is controlled by these configuration settings in `/packages/bp/src/core/config/config-loader.ts`:
- `admin.favicon: 'assets/studio/ui/public/img/xmati.png'`
- `studio.favicon: 'assets/studio/ui/public/img/xmati.png'`
- `webchat.favicon: 'assets/studio/ui/public/img/xmati.png'`

The configuration is already set correctly to use your new icon once you replace the file.