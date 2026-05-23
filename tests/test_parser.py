import pytest

from services.parser import OptimizationParseResult, parse_optimization_response


def test_parse_plain_json():
    raw = """{
        "root_cause": "Seq scan on large table",
        "optimized_sql": "SELECT id FROM data WHERE email = $1",
        "index_suggestions": ["CREATE INDEX idx_email ON data (email)"],
        "confidence": 0.9
    }"""
    result = parse_optimization_response(raw)
    assert isinstance(result, OptimizationParseResult)
    assert result.root_cause.startswith("Seq scan")
    assert len(result.index_suggestions) == 1
    assert result.confidence == 0.9


def test_parse_fenced_json():
    raw = """Here is the analysis:
```json
{
  "root_cause": "Missing index",
  "optimized_sql": "SELECT 1",
  "index_suggestions": [],
  "confidence": 0.7
}
```"""
    result = parse_optimization_response(raw)
    assert result.optimized_sql == "SELECT 1"
    assert result.index_suggestions == []


def test_parse_invalid_raises():
    with pytest.raises(Exception):
        parse_optimization_response("not json at all")
