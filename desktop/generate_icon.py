from PIL import Image, ImageDraw, ImageFont
import os

def create_codeforge_icon(output_dir):
    size = 256
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Background Rounded Rectangle
    bg_color = (24, 24, 27, 255) # Zinc-900 / Slate
    border_color = (200, 90, 50, 255) # Terracotta orange
    
    # Outer Glow / Border
    draw.rounded_rectangle([4, 4, size - 4, size - 4], radius=48, fill=bg_color, outline=border_color, width=4)

    # 2. Inner subtle gradient effect
    draw.rounded_rectangle([16, 16, size - 16, size - 16], radius=40, fill=(30, 27, 35, 255))

    # 3. Draw Stylized Code Brackets < / > with vibrant gradients
    # Left bracket <
    pts_left = [(90, 80), (45, 128), (90, 176)]
    draw.line(pts_left, fill=(234, 88, 12, 255), width=18, joint="curve")

    # Right bracket >
    pts_right = [(166, 80), (211, 128), (166, 176)]
    draw.line(pts_right, fill=(234, 88, 12, 255), width=18, joint="curve")

    # Slash /
    draw.line([(145, 70), (111, 186)], fill=(251, 146, 60, 255), width=14)

    # Small lightning spark / dot in the center
    draw.ellipse([120, 120, 136, 136], fill=(254, 215, 170, 255))

    # Save PNG
    png_path = os.path.join(output_dir, "icon.png")
    img.save(png_path, "PNG")

    # Save ICO with all standard Windows resolutions
    ico_path = os.path.join(output_dir, "icon.ico")
    img.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

    print(f"Generated icons at:\n  {png_path}\n  {ico_path}")

if __name__ == "__main__":
    out_dir = r"d:\MULTI LANGUAGE COMPILER\desktop"
    create_codeforge_icon(out_dir)
