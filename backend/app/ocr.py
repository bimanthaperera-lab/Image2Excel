from io import BytesIO
import re

from PIL import Image, ImageFilter, ImageOps, UnidentifiedImageError
import pytesseract

from backend.app.config import Settings


class OCRException(Exception):
    pass


def configure_tesseract(settings: Settings) -> None:
    if settings.tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd


def load_image(contents: bytes) -> Image.Image:
    try:
        image = Image.open(BytesIO(contents))
        image.load()
    except UnidentifiedImageError as exc:
        raise OCRException("Uploaded file is not a valid image.") from exc

    return image


def preprocess_image(image: Image.Image) -> Image.Image:
    grayscale = ImageOps.grayscale(image)
    normalized = ImageOps.autocontrast(grayscale)
    return normalized.filter(ImageFilter.SHARPEN)


def extract_text(contents: bytes, settings: Settings) -> str:
    configure_tesseract(settings)
    image = preprocess_image(load_image(contents))

    try:
        return pytesseract.image_to_string(image).strip()
    except pytesseract.TesseractNotFoundError as exc:
        raise OCRException(
            "Tesseract OCR is not installed or TESSERACT_CMD is not configured."
        ) from exc
    except pytesseract.TesseractError as exc:
        raise OCRException(f"OCR failed: {exc}") from exc


def text_to_rows(text: str) -> list[list[str]]:
    rows: list[list[str]] = []

    for line in text.splitlines():
        cleaned = line.strip()
        if not cleaned:
            continue

        cells = [cell.strip() for cell in re.split(r"\s{2,}|\t+|,", cleaned)]
        rows.append([cell for cell in cells if cell])

    return rows
