import os
from PIL import Image, ImageDraw, ImageFilter

def mask_original_shield():
    source_path = '/Users/ajayparasa/.gemini/antigravity-ide/brain/c6d5c4ed-990a-4e54-94f7-8a22bc0a136f/canopy_shield_vibrant.png'
    output_path = '/Users/ajayparasa/.gemini/antigravity-ide/brain/c6d5c4ed-990a-4e54-94f7-8a22bc0a136f/canvora_shield_clean.png'

    # Load original 1024x1024 image
    img = Image.open(source_path).convert("RGBA")
    width, height = img.size

    # Create a solid background image with the dashboard color (#030712)
    bg = Image.new("RGBA", (width, height), "#030712")

    # Create a black mask (0)
    mask = Image.new("L", (width, height), 0)
    mask_draw = ImageDraw.Draw(mask)

    # Define the polygon coordinates that wrap around the shield with a comfortable safety margin
    # Top-Left, Top-Center, Top-Right, Mid-Right, Bottom-Tip, Mid-Left
    shield_poly = [
        (210, 140),  # Top-Left
        (512, 85),   # Top-Center arch
        (814, 140),  # Top-Right
        (814, 530),  # Mid-Right
        (512, 810),  # Bottom-Tip
        (210, 530)   # Mid-Left
    ]

    # Draw solid white inside the shield polygon on the mask
    mask_draw.polygon(shield_poly, fill=255)

    # Apply a slight blur to the mask to keep the edges soft and anti-aliased
    mask_blurred = mask.filter(ImageFilter.GaussianBlur(radius=2))

    # Paste the original shield onto the solid background using our soft mask
    refined_img = Image.composite(img, bg, mask_blurred)

    # Let's crop it slightly to center and fill the square canvas better
    # Crop from Y: 70 to 838, X: 196 to 828 (632x632 square)
    crop_area = (196, 60, 828, 820)
    cropped_img = refined_img.crop(crop_area)

    # Save the clean, refined original shield
    cropped_img.save(output_path)
    print("Cleaned original AI branches logo and removed the circular frame successfully!")

if __name__ == '__main__':
    mask_original_shield()
