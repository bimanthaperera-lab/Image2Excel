from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from backend.app.config import Settings, get_settings
from backend.app.excel import rows_to_workbook
from backend.app.gemini import GeminiException, structure_text_with_gemini
from backend.app.ocr import OCRException, extract_text
from backend.app.schemas import OCRResponse


app = FastAPI(title="Image2Excel API", version="0.1.0")

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def read_image_file(file: UploadFile, settings: Settings) -> bytes:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload an image file.",
        )

    contents = await file.read()
    if len(contents) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image must be smaller than {settings.max_upload_mb} MB.",
        )

    return contents


async def run_ocr(contents: bytes, settings: Settings) -> OCRResponse:
    try:
        text = extract_text(contents, settings)
    except OCRException as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    try:
        columns, rows = await structure_text_with_gemini(text, settings)
    except GeminiException as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    return OCRResponse(text=text, columns=columns, rows=rows, row_count=len(rows))


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/ocr", response_model=OCRResponse)
async def ocr_image(
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
) -> OCRResponse:
    contents = await read_image_file(file, settings)
    return await run_ocr(contents, settings)


@app.post("/api/ocr/excel")
async def ocr_image_to_excel(
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
) -> StreamingResponse:
    contents = await read_image_file(file, settings)
    result = await run_ocr(contents, settings)
    workbook = rows_to_workbook(result.columns, result.rows, result.text)

    return StreamingResponse(
        workbook,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="image2excel.xlsx"'},
    )

import os
from fastapi.staticfiles import StaticFiles

# Serve the frontend dist folder if it exists
if os.path.isdir("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="static")

