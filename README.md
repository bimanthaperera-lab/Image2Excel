# Image2Excel

OCR-powered single page Image to Excel website.

The image OCR is done by Python/Tesseract. Gemini receives only the extracted OCR
text and converts that text into a structured table for preview and Excel export.

## Backend setup

Install the Tesseract OCR engine first:

- Windows: install from `https://github.com/UB-Mannheim/tesseract/wiki`
- Ubuntu/Debian: `sudo apt install tesseract-ocr`
- macOS: `brew install tesseract`

Then install Python dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

If Tesseract is not in your system `PATH`, create a `.env` file:

```env
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

Run the backend:

```bash
uvicorn backend.app.main:app --reload
```

API docs will be available at `http://127.0.0.1:8000/docs`.

## Frontend setup

Install and run the React app:

```bash
pnpm install
pnpm dev
```

The frontend runs at `http://127.0.0.1:5173` and calls the backend at
`http://127.0.0.1:8000` by default.

To point the frontend at another backend URL, create `.env.local`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Endpoints

- `GET /health` - backend status
- `POST /api/ocr` - upload an image and get Python OCR text plus Gemini table JSON
- `POST /api/ocr/excel` - upload an image and download the Gemini-shaped table as `.xlsx`

## Project Structure

```text
Image2Excel/
├── .github/
│   └── workflows/
│       └── ci-cd.yml        # GitHub Actions CI/CD pipeline
├── backend/
│   ├── app/
│   │   ├── __init__.py      # App initialization
│   │   ├── config.py        # Environment variables & configuration
│   │   ├── excel.py         # Excel generation logic
│   │   ├── gemini.py        # Gemini API integration for JSON table
│   │   ├── main.py          # FastAPI application & endpoints
│   │   ├── ocr.py           # Tesseract OCR extraction logic
│   │   └── schemas.py       # Pydantic models
│   └── tests/
│       ├── test_excel.py    # Unit tests for excel generation
│       ├── test_gemini.py   # Unit tests for Gemini parsing
│       ├── test_main.py     # API endpoint tests
│       └── test_ocr.py      # Unit tests for OCR processing
├── src/
│   ├── App.jsx              # Main React component
│   ├── main.jsx             # React entry point
│   └── styles.css           # Global CSS styles
├── index.html               # Vite HTML entry point
├── package.json             # Node.js dependencies & scripts
├── pnpm-lock.yaml           # pnpm package lockfile
├── requirements.txt         # Python dependencies
├── Dockerfile               # Multi-stage Docker build
├── .env.example             # Example environment variables
├── .gitignore               # Git ignore rules
├── .dockerignore            # Docker ignore rules
└── README.md                # Project documentation
```
