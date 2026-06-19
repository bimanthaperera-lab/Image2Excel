from pydantic import BaseModel


class OCRResponse(BaseModel):
    text: str
    columns: list[str]
    rows: list[list[str]]
    row_count: int
