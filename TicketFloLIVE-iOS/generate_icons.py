#!/usr/bin/env python3
"""
Generate basic app icons for iOS app
Creates simple colored squares for all required icon sizes
"""

from PIL import Image, ImageDraw, ImageFont
import os

# TicketFlo brand color (from the web app)
BRAND_COLOR = (34, 197, 94)  # Green color from the web app

def create_icon(size, filename):
    """Create a simple icon with the TicketFlo 'T' logo"""
    # Create image
    img = Image.new('RGB', (size, size), BRAND_COLOR)
    draw = ImageDraw.Draw(img)

    # Add a simple "T" for TicketFlo
    try:
        # Try to use a system font
        font_size = size // 2
        font = ImageFont.truetype("/System/Library/Fonts/SF-Pro-Display-Bold.otf", font_size)
    except:
        # Fallback to default font
        font = ImageFont.load_default()

    # Draw white "T" in center
    text = "T"
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]

    x = (size - text_width) // 2
    y = (size - text_height) // 2

    draw.text((x, y), text, fill=(255, 255, 255), font=font)

    return img

# Icon sizes required for iOS
icon_specs = [
    # iPhone icons
    (40, "icon-40x40@1x.png"),      # 20x20@2x
    (60, "icon-60x60@1x.png"),      # 20x20@3x
    (58, "icon-58x58@1x.png"),      # 29x29@2x
    (87, "icon-87x87@1x.png"),      # 29x29@3x
    (80, "icon-80x80@1x.png"),      # 40x40@2x
    (120, "icon-120x120@1x.png"),   # 40x40@3x and 60x60@2x
    (180, "icon-180x180@1x.png"),   # 60x60@3x

    # iPad icons
    (20, "icon-20x20@1x.png"),      # 20x20@1x
    (40, "icon-40x40@2x.png"),      # 20x20@2x
    (29, "icon-29x29@1x.png"),      # 29x29@1x
    (58, "icon-58x58@2x.png"),      # 29x29@2x
    (40, "icon-40x40@1x-ipad.png"), # 40x40@1x
    (80, "icon-80x80@2x.png"),      # 40x40@2x
    (152, "icon-152x152@1x.png"),   # 76x76@2x
    (167, "icon-167x167@1x.png"),   # 83.5x83.5@2x

    # App Store icon
    (1024, "icon-1024x1024@1x.png") # 1024x1024@1x
]

# Create icons directory
icon_dir = "/Users/mitchellthompson/Desktop/pulse-ticket-launch/TicketFloLIVE-iOS/TicketFloLIVE/Assets.xcassets/AppIcon.appiconset"

print(f"Creating app icons in {icon_dir}")

for size, filename in icon_specs:
    icon = create_icon(size, filename)
    filepath = os.path.join(icon_dir, filename)
    icon.save(filepath, "PNG")
    print(f"Created {filename} ({size}x{size})")

print("✅ All app icons created successfully!")