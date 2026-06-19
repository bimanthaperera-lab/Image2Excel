import { useMemo, useRef, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function Icon({ children, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

function App() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [rawText, setRawText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("WAITING FOR SOURCE");

  const hasResult = rows.length > 0;
  const fileSize = useMemo(() => {
    if (!file) return "";
    return `${(file.size / 1024 / 1024).toFixed(2)} MB`;
  }, [file]);

  function setSelectedFile(nextFile) {
    if (!nextFile) return;

    setFile(nextFile);
    setColumns([]);
    setRows([]);
    setRawText("");
    setError("");
    setStatus("READY TO EXTRACT");

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(nextFile.type.startsWith("image/") ? URL.createObjectURL(nextFile) : "");
  }

  async function extractTable(nextFile = file) {
    if (!nextFile) {
      inputRef.current?.click();
      return;
    }

    setIsProcessing(true);
    setError("");
    setStatus("PYTHON OCR RUNNING");

    const formData = new FormData();
    formData.append("file", nextFile);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ocr`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Extraction failed.");
      }

      setColumns(data.columns?.length ? data.columns : ["Column 1"]);
      setRows(data.rows || []);
      setRawText(data.text || "");
      setStatus("TABLE READY");
      document.getElementById("data-preview")?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setError(err.message);
      setStatus("EXTRACTION FAILED");
    } finally {
      setIsProcessing(false);
    }
  }

  async function downloadExcel() {
    if (!file) {
      inputRef.current?.click();
      return;
    }

    setIsProcessing(true);
    setError("");
    setStatus("PREPARING XLSX");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ocr/excel`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Excel download failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "image2excel.xlsx";
      link.click();
      URL.revokeObjectURL(url);
      setStatus("XLSX DOWNLOADED");
    } catch (err) {
      setError(err.message);
      setStatus("DOWNLOAD FAILED");
    } finally {
      setIsProcessing(false);
    }
  }

  async function copyTable() {
    if (!hasResult) return;
    const text = [columns.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n");
    await navigator.clipboard.writeText(text);
    setStatus("COPIED TO CLIPBOARD");
  }

  function handleFileChange(event) {
    const nextFile = event.target.files?.[0];
    setSelectedFile(nextFile);
    if (nextFile) extractTable(nextFile);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    const nextFile = event.dataTransfer.files?.[0];
    setSelectedFile(nextFile);
    if (nextFile) extractTable(nextFile);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface font-body text-on-surface">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-outline-variant bg-surface/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-6">
          <a className="font-display text-2xl font-bold text-primary" href="#home">
            OpticSheet
          </a>
          <div className="hidden items-center gap-8 md:flex">
            <a className="relative pb-2 text-base text-primary after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-100 after:bg-primary after:transition-transform after:duration-300" href="#home">
              Home
            </a>
            <a className="relative pb-2 text-base text-on-surface-variant transition-colors after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 hover:text-primary hover:after:scale-x-100" href="#how-it-works">
              How it Works
            </a>
            <a className="relative pb-2 text-base text-on-surface-variant transition-colors after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 hover:text-primary hover:after:scale-x-100" href="#features">
              Features
            </a>
            <a className="relative pb-2 text-base text-on-surface-variant transition-colors after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 hover:text-primary hover:after:scale-x-100" href="#contact">
              Contact
            </a>
          </div>
          <button
            className="rounded bg-primary px-6 py-3 font-semibold text-on-primary shadow-sm transition-all hover:bg-secondary active:scale-95"
            onClick={() => inputRef.current?.click()}
          >
            Upload
          </button>
        </div>
      </nav>

      <main className="pt-16">
        <section className="technical-grid relative flex min-h-[819px] items-center overflow-hidden py-20" id="home">
          <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-6 px-6 lg:grid-cols-12">
            <div className="space-y-2 lg:col-span-7">
              <div className="mb-4 inline-flex items-center rounded-sm bg-secondary-container px-3 py-1 text-on-secondary-container">
                <span className="font-technical text-sm font-medium uppercase tracking-wider">V2.4 OCR ENGINE ACTIVE</span>
              </div>
              <h1 className="mb-6 font-display text-4xl font-bold leading-tight md:text-5xl">
                CONVERT <span className="text-primary">IMAGES</span> TO EXCEL DATA WITH{" "}
                <span className="underline decoration-primary/30">99.9% ACCURACY</span>
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-8 text-on-surface-variant">
                Automate your financial workflows. OpticSheet AI extracts complex tabular data from images and PDFs directly into structured spreadsheets in seconds.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  className="flex items-center gap-2 rounded-lg bg-primary px-8 py-4 font-semibold text-on-primary transition-all hover:bg-secondary"
                  onClick={() => inputRef.current?.click()}
                >
                  Start Extracting
                  <Icon>arrow_forward</Icon>
                </button>
                <a className="rounded-lg border border-outline bg-surface px-8 py-4 font-semibold transition-all hover:border-primary" href="#data-preview">
                  View Preview
                </a>
              </div>
            </div>

            <div className="lg:col-span-5" id="upload">
              <div
                className={`group relative flex min-h-[400px] flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-white p-8 text-center shadow-sm transition-all duration-300 ${
                  isDragging ? "drag-over border-primary" : "border-outline-variant"
                }`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <div className={`absolute left-0 top-0 h-1 origin-left bg-primary transition-all duration-700 ${isProcessing ? "w-full animate-pulse" : "w-0"}`} />
                {previewUrl ? (
                  <img alt="Uploaded source preview" className="mb-5 max-h-48 w-full rounded-lg object-contain" src={previewUrl} />
                ) : (
                  <div className="mb-6 rounded-full bg-surface-container-low p-6 transition-colors group-hover:bg-primary-container">
                    <Icon className="text-5xl text-primary">cloud_upload</Icon>
                  </div>
                )}
                <h3 className="mb-2 font-display text-2xl font-bold">UPLOAD SOURCE</h3>
                <p className="mb-6 font-technical text-sm uppercase tracking-wider text-on-surface-variant">
                  {file ? `${file.name} · ${fileSize}` : "DROP IMAGE OR PDF HERE"}
                </p>
                <input accept="image/*" className="hidden" onChange={handleFileChange} ref={inputRef} type="file" />
                <button
                  className="rounded-lg bg-primary px-6 py-3 font-semibold text-on-primary shadow-lg transition-all hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isProcessing}
                  onClick={() => inputRef.current?.click()}
                >
                  Select Files
                </button>
                <div className="mt-8 grid grid-cols-3 gap-4 opacity-40">
                  <Icon className="text-3xl">image</Icon>
                  <Icon className="text-3xl">document_scanner</Icon>
                  <Icon className="text-3xl">table_chart</Icon>
                </div>
                <p className="mt-6 font-technical text-sm uppercase tracking-wider text-primary">{status}</p>
                {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface py-20" id="data-preview">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
              <div>
                <span className="mb-2 block font-technical text-sm uppercase tracking-widest text-primary">Live Extraction</span>
                <h2 className="font-display text-4xl font-bold md:text-5xl">Data Preview</h2>
              </div>
              <div className="flex gap-3">
                <button
                  className="flex items-center gap-2 rounded border border-outline px-4 py-2 font-semibold transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!hasResult}
                  onClick={copyTable}
                >
                  <Icon className="text-lg">content_copy</Icon>
                  Copy to Clipboard
                </button>
                <button
                  className="flex items-center gap-2 rounded bg-primary px-4 py-2 font-semibold text-on-primary transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!file || isProcessing}
                  onClick={downloadExcel}
                >
                  <Icon className="text-lg">download</Icon>
                  Download .XLSX
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white shadow-sm">
              {hasResult ? (
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-low">
                      {columns.map((column, index) => (
                        <th className="whitespace-nowrap p-4 font-technical text-sm uppercase text-on-surface-variant" key={`${column}-${index}`}>
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="font-technical text-sm">
                    {rows.map((row, rowIndex) => (
                      <tr className="border-b border-outline-variant transition-colors hover:bg-surface-container-lowest" key={rowIndex}>
                        {columns.map((_, cellIndex) => (
                          <td className="max-w-[300px] p-4 align-top" key={cellIndex}>
                            {row[cellIndex] || ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex min-h-[240px] flex-col items-center justify-center p-8 text-center">
                  <Icon className="mb-4 text-5xl text-primary">table_chart</Icon>
                  <h3 className="mb-2 font-display text-2xl font-bold">NO DATA EXTRACTED YET</h3>
                  <p className="max-w-md text-on-surface-variant">
                    Upload an image to preview the table here. Demo data has been removed.
                  </p>
                </div>
              )}
            </div>

            {rawText && (
              <details className="mt-6 rounded-lg border border-outline-variant bg-white p-4">
                <summary className="cursor-pointer font-technical text-sm uppercase tracking-wider text-primary">Raw Python OCR text</summary>
                <pre className="mt-4 whitespace-pre-wrap font-technical text-sm text-on-surface-variant">{rawText}</pre>
              </details>
            )}
          </div>
        </section>

        <section className="bg-surface-container-lowest py-20" id="how-it-works">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="mb-16 text-center">
              <span className="mb-2 block font-technical text-sm uppercase tracking-widest text-primary">Workflow</span>
              <h2 className="mb-4 font-display text-4xl font-bold md:text-5xl">How it Works</h2>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                ["upload_file", "01. Upload", "Drop your image. JPG and PNG are ready for the current backend."],
                ["memory", "02. Process", "Python/Tesseract extracts the OCR text from the image."],
                ["download_for_offline", "03. Export", "Gemini shapes that text into table rows and Excel downloads it."],
              ].map(([icon, title, body]) => (
                <div className="group rounded-xl border border-outline-variant bg-surface p-8 transition-colors hover:border-primary" key={title}>
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container group-hover:bg-primary-container">
                    <Icon className="text-primary">{icon}</Icon>
                  </div>
                  <h4 className="mb-4 font-display text-2xl font-bold">{title}</h4>
                  <p className="text-on-surface-variant">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20" id="features">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="grid grid-cols-1 items-center gap-20 lg:grid-cols-2">
              <div className="relative">
                <div className="relative aspect-video overflow-hidden rounded-xl border border-outline-variant bg-surface-container shadow-2xl">
                  <div className="technical-grid h-full w-full bg-surface-container-low" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded border border-outline-variant bg-white/90 p-4 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                      <span className="font-technical text-sm uppercase">PROCESSING: OCR_TEXT</span>
                    </div>
                    <span className="font-technical text-sm uppercase text-primary">TABLE READY</span>
                  </div>
                </div>
              </div>
              <div className="space-y-8">
                <div>
                  <h2 className="mb-6 font-display text-4xl font-bold md:text-5xl">Engineered for Accuracy</h2>
                  <p className="text-lg leading-8 text-on-surface-variant">
                    Stop manual data entry. Extract text locally in Python, then use Gemini only for table formatting.
                  </p>
                </div>
                <div className="space-y-6">
                  {[
                    ["check", "OCR Precision", "Tesseract handles the image text extraction step."],
                    ["table_chart", "Structured Tables", "Gemini receives text and returns columns plus rows."],
                    ["lock", "API Key Safety", "Gemini API key stays on the backend, not in the browser."],
                  ].map(([icon, title, body]) => (
                    <div className="flex items-start gap-4" key={title}>
                      <div className="mt-1 rounded bg-primary-container p-1">
                        <Icon className="text-[20px] text-primary">{icon}</Icon>
                      </div>
                      <div>
                        <h5 className="mb-1 text-lg font-bold">{title}</h5>
                        <p className="text-on-surface-variant">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="technical-grid-primary relative mx-auto max-w-[1200px] overflow-hidden rounded-2xl bg-primary p-12 text-center text-on-primary md:p-20">
            <div className="relative z-10">
              <h2 className="mb-8 font-display text-4xl font-bold md:text-5xl">Ready to automate your data?</h2>
              <p className="mx-auto mb-10 max-w-2xl text-lg leading-8 opacity-90">
                Upload an image and convert it into a previewable Excel-ready table.
              </p>
              <button
                className="rounded-lg bg-white px-10 py-5 font-bold text-primary shadow-xl transition-all hover:bg-secondary-container"
                onClick={() => inputRef.current?.click()}
              >
                Get Started Now
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant bg-surface-container-low" id="contact">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-8 px-6 py-20 md:grid-cols-2">
          <div className="space-y-6">
            <div className="font-display text-2xl font-bold text-primary">OpticSheet AI</div>
            <p className="max-w-sm text-on-surface-variant">
              Precision OCR for image to Excel workflows.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <h6 className="font-technical text-sm font-bold uppercase">Resources</h6>
              <ul className="space-y-2">
                <li><a className="text-on-surface-variant transition-colors hover:text-primary" href="http://127.0.0.1:8000/docs">API Documentation</a></li>
                <li><a className="text-on-surface-variant transition-colors hover:text-primary" href="#how-it-works">Workflow</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h6 className="font-technical text-sm font-bold uppercase">Export</h6>
              <ul className="space-y-2">
                <li><button className="text-on-surface-variant transition-colors hover:text-primary" onClick={copyTable}>Copy Table</button></li>
                <li><button className="text-on-surface-variant transition-colors hover:text-primary" onClick={downloadExcel}>Download XLSX</button></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
