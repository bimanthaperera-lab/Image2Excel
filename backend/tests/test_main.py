from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config import get_settings, Settings
import pytest
import io

client = TestClient(app)

def get_settings_override():
    return Settings(
        max_upload_mb=1,
        allowed_origins=["*"],
        gemini_api_key="test_key"
    )

app.dependency_overrides[get_settings] = get_settings_override

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_upload_not_image():
    # Attempt to upload a text file instead of an image
    file_content = b"This is a text file."
    files = {"file": ("test.txt", file_content, "text/plain")}
    
    response = client.post("/api/ocr", files=files)
    assert response.status_code == 400
    assert "Please upload an image file" in response.json()["detail"]

def test_upload_too_large():
    # Use max_upload_mb = 0 to trigger too large exception
    def get_settings_small_limit():
        return Settings(max_upload_mb=0)
        
    app.dependency_overrides[get_settings] = get_settings_small_limit
    
    file_content = b"fake image content"
    files = {"file": ("test.jpg", file_content, "image/jpeg")}
    
    response = client.post("/api/ocr", files=files)
    assert response.status_code == 413
    assert "smaller than 0" in response.json()["detail"]
    
    # Restore the dependency override
    app.dependency_overrides[get_settings] = get_settings_override
