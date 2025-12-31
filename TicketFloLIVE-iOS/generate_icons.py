#!/usr/bin/env python3
"""
Generate iOS app icons from the existing TicketFlo logo
Resizes the apple-touch-icon.png to all required iOS icon sizes
"""

from PIL import Image
import os

# Source logo
SOURCE_LOGO = "/Users/mitchellthompson/Desktop/pulse-ticket-launch/dist/apple-touch-icon.png"

def create_icon(source_img, size, filename, output_dir):
    """Resize the source logo to the specified size"""
    # High quality resize
    resized = source_img.resize((size, size), Image.Resampling.LANCZOS)
    filepath = os.path.join(output_dir, filename)
    resized.save(filepath, "PNG")
    print(f"Created {filename} ({size}x{size})")

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

# Output directory
icon_dir = "/Users/mitchellthompson/Desktop/pulse-ticket-launch/TicketFloLIVE-iOS/TicketFloLIVE/Assets.xcassets/AppIcon.appiconset"

print(f"Loading source logo: {SOURCE_LOGO}")
source_img = Image.open(SOURCE_LOGO)

# Convert to RGB if necessary (remove alpha for app icons)
if source_img.mode in ('RGBA', 'LA') or (source_img.mode == 'P' and 'transparency' in source_img.info):
    # Create white background
    background = Image.new('RGB', source_img.size, (255, 255, 255))
    if source_img.mode == 'P':
        source_img = source_img.convert('RGBA')
    background.paste(source_img, mask=source_img.split()[-1] if source_img.mode == 'RGBA' else None)
    source_img = background

print(f"Creating app icons in {icon_dir}")

for size, filename in icon_specs:
    create_icon(source_img, size, filename, icon_dir)

print("\n✅ All app icons created successfully!")
print("Now open Xcode and the icons should appear in Assets.xcassets > AppIcon")
