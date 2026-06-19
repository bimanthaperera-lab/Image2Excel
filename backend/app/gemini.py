import json
import re

import httpx

from backend.app.config import Settings
from backend.app.ocr import text_to_rows


class GeminiException(Exception):
    pass


def _fallback_table(text: str) -> tuple[list[str], list[list[str]]]:
    rows = text_to_rows(text)
    column_count = max((len(row) for row in rows), default=1)
    columns = [f"Column {index}" for index in range(1, column_count + 1)]
    return columns, rows


def _json_from_model_text(model_text: str) -> dict:
    cleaned = model_text.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)```", cleaned, flags=re.DOTALL | re.IGNORECASE)
    if fenced:
        cleaned = fenced.group(1).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise GeminiException("Gemini returned invalid table JSON.") from exc


def _normalize_table(data: dict, raw_text: str) -> tuple[list[str], list[list[str]]]:
    columns = data.get("columns")
    rows = data.get("rows")

    if not isinstance(columns, list) or not isinstance(rows, list):
        raise GeminiException("Gemini table JSON must include columns and rows arrays.")

    normalized_columns = [str(column).strip() or f"Column {index}" for index, column in enumerate(columns, 1)]
    normalized_rows: list[list[str]] = []

    for row in rows:
        if isinstance(row, dict):
            normalized_rows.append([str(row.get(column, "")).strip() for column in normalized_columns])
        elif isinstance(row, list):
            normalized_rows.append([str(cell).strip() for cell in row])

    if not normalized_rows:
        return _fallback_table(raw_text)

    column_count = max(len(normalized_columns), max(len(row) for row in normalized_rows))
    if len(normalized_columns) < column_count:
        normalized_columns.extend(
            f"Column {index}" for index in range(len(normalized_columns) + 1, column_count + 1)
        )

    normalized_rows = [
        row + [""] * (column_count - len(row)) if len(row) < column_count else row[:column_count]
        for row in normalized_rows
    ]
    return normalized_columns, normalized_rows


async def structure_text_with_gemini(text: str, settings: Settings) -> tuple[list[str], list[list[str]]]:
    if not text.strip():
        return ["Column 1"], []

    if not settings.gemini_api_key:
        raise GeminiException("GEMINI_API_KEY is not configured.")

    prompt = f"""
You receive OCR text extracted by a Python backend from an image.
Do not perform OCR. Only convert the provided OCR text into a clean table.

Return JSON only in this exact shape:
{{
  "columns": ["Column name"],
  "rows": [["Cell value"]]
}}

Rules:
- Infer useful column headers from the text.
- Preserve all visible numeric values, dates, totals, invoice IDs, and labels.
- Use strings for every cell.
- If the text has no obvious table, create the best structured table from line items.

OCR text:
{text}
""".strip()

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
    )
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "response_mime_type": "application/json",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:500]
        raise GeminiException(f"Gemini API request failed: {detail}") from exc
    except httpx.HTTPError as exc:
        raise GeminiException(f"Gemini API request failed: {exc}") from exc

    data = response.json()
    try:
        model_text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as exc:
        raise GeminiException("Gemini API response did not include table JSON.") from exc

    return _normalize_table(_json_from_model_text(model_text), text)
