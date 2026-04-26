#!/usr/bin/env python3
"""Generate a branded Grill Time QR code poster for in-store display.

Outputs:
  qr/grill-time-qr.png       — 1200x1500 print-ready poster (charcoal frame, white card, logo)
  qr/grill-time-qr-plain.png — bare QR with logo embedded (1024x1024) for stickers / web use
"""

from pathlib import Path
import qrcode
from qrcode.constants import ERROR_CORRECT_H
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers.pil import RoundedModuleDrawer
from PIL import Image, ImageDraw, ImageFont

URL = "https://grilltimelb.com/#menu"
PHONE = "+961 81 699 224"

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = REPO_ROOT / "qr"
OUT_DIR.mkdir(exist_ok=True)

LOGO_PATH = REPO_ROOT / "images" / "logo.png"

# Brand
CHARCOAL = (12, 10, 9)
RED = (225, 35, 43)
GOLD = (255, 176, 46)
CREAM = (244, 237, 228)
WHITE = (255, 255, 255)


def find_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def build_qr(data: str, box_size: int = 16, border: int = 2) -> Image.Image:
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,  # 30% damage tolerance — needed for logo overlay
        box_size=box_size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(),
        fill_color=CHARCOAL,
        back_color=WHITE,
    ).convert("RGBA")
    return img


def overlay_logo(qr_img: Image.Image, logo_path: Path, scale: float = 0.22) -> Image.Image:
    if not logo_path.exists():
        return qr_img
    logo = Image.open(logo_path).convert("RGBA")

    qw, qh = qr_img.size
    target = int(qw * scale)
    logo.thumbnail((target, target), Image.LANCZOS)

    # White rounded backplate so the logo sits cleanly without breaking the QR
    pad = 24
    plate_size = (logo.width + pad * 2, logo.height + pad * 2)
    plate = Image.new("RGBA", plate_size, (0, 0, 0, 0))
    pd = ImageDraw.Draw(plate)
    pd.rounded_rectangle(
        [(0, 0), (plate_size[0] - 1, plate_size[1] - 1)],
        radius=28, fill=WHITE
    )

    canvas = qr_img.copy()
    cx = (qw - plate_size[0]) // 2
    cy = (qh - plate_size[1]) // 2
    canvas.alpha_composite(plate, dest=(cx, cy))
    canvas.alpha_composite(logo, dest=(cx + pad, cy + pad))
    return canvas


def draw_centered(draw: ImageDraw.ImageDraw, xy_center, text: str, font, fill):
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    cx, cy = xy_center
    draw.text((cx - w / 2 - bbox[0], cy - h / 2 - bbox[1]), text, font=font, fill=fill)


def build_poster(qr_with_logo: Image.Image) -> Image.Image:
    W, H = 1200, 1500
    poster = Image.new("RGBA", (W, H), CHARCOAL + (255,))
    draw = ImageDraw.Draw(poster)

    # Top eyebrow
    eyebrow = find_font(34, bold=True)
    draw_centered(draw, (W // 2, 130), "S C A N   O U R   M E N U", eyebrow, GOLD)

    # Title
    title = find_font(120, bold=True)
    draw_centered(draw, (W // 2, 230), "GRILL TIME", title, CREAM)

    # Subtitle
    subtitle = find_font(34, bold=False)
    draw_centered(draw, (W // 2, 320), "Premium Lebanese Grill", subtitle, CREAM)

    # White card behind QR
    card_size = 920
    card_x = (W - card_size) // 2
    card_y = 380
    draw.rounded_rectangle(
        [(card_x, card_y), (card_x + card_size, card_y + card_size)],
        radius=36, fill=WHITE,
    )

    # QR
    qr_size = card_size - 60
    qr_resized = qr_with_logo.resize((qr_size, qr_size), Image.LANCZOS)
    poster.alpha_composite(qr_resized, dest=(card_x + 30, card_y + 30))

    # Red accent bar under QR
    bar_y = card_y + card_size + 40
    draw.rounded_rectangle(
        [(card_x + 60, bar_y), (card_x + card_size - 60, bar_y + 6)],
        radius=3, fill=RED,
    )

    # Tagline + phone
    tagline = find_font(40, bold=True)
    draw_centered(draw, (W // 2, bar_y + 60), "Powered by Time Food", tagline, CREAM)

    phone_font = find_font(34, bold=False)
    draw_centered(draw, (W // 2, bar_y + 115), PHONE, phone_font, GOLD)

    return poster


def main() -> None:
    print(f"Building QR for: {URL}")

    # 1) Plain QR with logo
    qr_img = build_qr(URL, box_size=20, border=2)
    qr_branded = overlay_logo(qr_img, LOGO_PATH, scale=0.22)
    plain_size = (1024, 1024)
    qr_branded.resize(plain_size, Image.LANCZOS).save(OUT_DIR / "grill-time-qr-plain.png")
    print(f"  wrote {OUT_DIR / 'grill-time-qr-plain.png'}")

    # 2) Full poster
    poster = build_poster(qr_branded)
    poster.convert("RGB").save(OUT_DIR / "grill-time-qr.png", quality=95)
    print(f"  wrote {OUT_DIR / 'grill-time-qr.png'}")


if __name__ == "__main__":
    main()
