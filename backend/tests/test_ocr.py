from backend.app.ocr import text_to_rows

def test_text_to_rows_simple():
    text = "Name\tAge\nAlice\t30\nBob\t25"
    rows = text_to_rows(text)
    
    assert len(rows) == 3
    assert rows[0] == ["Name", "Age"]
    assert rows[1] == ["Alice", "30"]
    assert rows[2] == ["Bob", "25"]

def test_text_to_rows_multiple_spaces():
    text = "Name    Age\nAlice   30\nBob     25"
    rows = text_to_rows(text)
    
    assert len(rows) == 3
    assert rows[0] == ["Name", "Age"]
    assert rows[1] == ["Alice", "30"]
    assert rows[2] == ["Bob", "25"]

def test_text_to_rows_commas():
    text = "Name,Age\nAlice,30\nBob,25"
    rows = text_to_rows(text)
    
    assert len(rows) == 3
    assert rows[0] == ["Name", "Age"]
    assert rows[1] == ["Alice", "30"]
    assert rows[2] == ["Bob", "25"]

def test_text_to_rows_empty_lines():
    text = "\n\nName,Age\n\nAlice,30\n\n"
    rows = text_to_rows(text)
    
    assert len(rows) == 2
    assert rows[0] == ["Name", "Age"]
    assert rows[1] == ["Alice", "30"]

def test_text_to_rows_empty_string():
    rows = text_to_rows("")
    assert len(rows) == 0
