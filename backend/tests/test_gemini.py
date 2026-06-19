import pytest
from backend.app.gemini import _json_from_model_text, _normalize_table, GeminiException

def test_json_from_model_text_clean():
    text = '{"columns": ["A"], "rows": [["B"]]}'
    data = _json_from_model_text(text)
    assert data == {"columns": ["A"], "rows": [["B"]]}

def test_json_from_model_text_markdown():
    text = '''```json
{
  "columns": ["Name"],
  "rows": [["Alice"]]
}
```'''
    data = _json_from_model_text(text)
    assert data == {"columns": ["Name"], "rows": [["Alice"]]}

def test_json_from_model_text_invalid():
    text = 'invalid json'
    with pytest.raises(GeminiException):
        _json_from_model_text(text)

def test_normalize_table_valid():
    data = {
        "columns": ["Name", "Age"],
        "rows": [
            {"Name": "Alice", "Age": 30},
            ["Bob", 25]
        ]
    }
    columns, rows = _normalize_table(data, "raw")
    
    assert columns == ["Name", "Age"]
    assert rows == [["Alice", "30"], ["Bob", "25"]]

def test_normalize_table_missing_columns():
    data = {
        "columns": ["Name"],
        "rows": [
            ["Alice", "30"],
            ["Bob"]
        ]
    }
    columns, rows = _normalize_table(data, "raw")
    
    assert columns == ["Name", "Column 2"]
    assert rows == [["Alice", "30"], ["Bob", ""]]

def test_normalize_table_invalid_format():
    data = {"columns": "not a list", "rows": "not a list"}
    with pytest.raises(GeminiException):
        _normalize_table(data, "raw")
