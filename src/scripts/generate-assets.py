import os
from PIL import Image, ImageDraw

ROOT_DIR = "d:/computer.pletig"
LOGO_PATH = os.path.join(ROOT_DIR, "Logo.jpg")

def create_round_image(img):
    mask = Image.new('L', img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0) + img.size, fill=255)
    output = Image.new('RGBA', img.size, (255, 255, 255, 0))
    output.paste(img, (0, 0), mask=mask)
    return output

def create_foreground(img, size):
    # Adaptive icon foreground: canvas is `size` x `size`, logo placed in the center (~65% scale)
    fg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    logo_size = int(size * 0.72)
    resized_logo = img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    offset = (size - logo_size) // 2
    fg.paste(resized_logo, (offset, offset))
    return fg

def main():
    if not os.path.exists(LOGO_PATH):
        print(f"Error: {LOGO_PATH} not found!")
        return

    base_img = Image.open(LOGO_PATH).convert('RGBA')
    print(f"Loaded logo: {base_img.size}")

    # 1. Favicon .ico for Next.js and Public
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    app_favicon = os.path.join(ROOT_DIR, "src/app/favicon.ico")
    public_favicon = os.path.join(ROOT_DIR, "public/favicon.ico")
    
    # Save multi-size .ico
    base_img.save(app_favicon, format='ICO', sizes=ico_sizes)
    base_img.save(public_favicon, format='ICO', sizes=ico_sizes)
    print("✓ Saved src/app/favicon.ico & public/favicon.ico")

    # 2. Next.js App Router Icons & Apple Touch Icon
    icon_png_path = os.path.join(ROOT_DIR, "src/app/icon.png")
    public_icon_path = os.path.join(ROOT_DIR, "public/icon.png")
    apple_icon_path = os.path.join(ROOT_DIR, "src/app/apple-icon.png")
    public_apple_icon_path = os.path.join(ROOT_DIR, "public/apple-touch-icon.png")
    public_logo_png = os.path.join(ROOT_DIR, "public/logo.png")

    img_512 = base_img.resize((512, 512), Image.Resampling.LANCZOS)
    img_180 = base_img.resize((180, 180), Image.Resampling.LANCZOS)

    img_512.save(icon_png_path, "PNG")
    img_512.save(public_icon_path, "PNG")
    img_512.save(public_logo_png, "PNG")
    img_180.save(apple_icon_path, "PNG")
    img_180.save(public_apple_icon_path, "PNG")
    print("✓ Saved icon.png, apple-icon.png, and logo.png")

    # 3. Android Mipmap Icons
    # Density: (launcher_size, foreground_size)
    android_densities = {
        "mipmap-mdpi": (48, 108),
        "mipmap-hdpi": (72, 162),
        "mipmap-xhdpi": (96, 216),
        "mipmap-xxhdpi": (144, 324),
        "mipmap-xxxhdpi": (192, 432),
    }

    res_dir = os.path.join(ROOT_DIR, "android/app/src/main/res")
    if os.path.exists(res_dir):
        for folder, (size, fg_size) in android_densities.items():
            dest_folder = os.path.join(res_dir, folder)
            os.makedirs(dest_folder, exist_ok=True)

            # Square launcher
            launcher = base_img.resize((size, size), Image.Resampling.LANCZOS)
            launcher.save(os.path.join(dest_folder, "ic_launcher.png"), "PNG")

            # Round launcher
            round_launcher = create_round_image(launcher)
            round_launcher.save(os.path.join(dest_folder, "ic_launcher_round.png"), "PNG")

            # Foreground adaptive icon
            fg = create_foreground(base_img, fg_size)
            fg.save(os.path.join(dest_folder, "ic_launcher_foreground.png"), "PNG")

            print(f"✓ Updated Android icons for {folder} ({size}x{size})")

        # 4. Splash Screen Images
        # Main drawable splash
        drawable_dir = os.path.join(res_dir, "drawable")
        if os.path.exists(drawable_dir):
            splash = base_img.resize((480, 480), Image.Resampling.LANCZOS)
            splash.save(os.path.join(drawable_dir, "splash.png"), "PNG")
            print("✓ Updated android/app/src/main/res/drawable/splash.png")

        # Also update all drawable-port-* and drawable-land-*
        for item in os.listdir(res_dir):
            if item.startswith("drawable-port-") or item.startswith("drawable-land-"):
                splash_path = os.path.join(res_dir, item, "splash.png")
                splash.save(splash_path, "PNG")
                print(f"✓ Updated splash for {item}")

    print("\n🎉 SEMUA ASET LOGO, FAVICON, DAN ANDROID APK ICON SELESAI DIGENERASI!")

if __name__ == '__main__':
    main()
