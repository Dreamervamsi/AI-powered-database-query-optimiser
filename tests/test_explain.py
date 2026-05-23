from services.explain import is_safe_select


def test_safe_select():
    assert is_safe_select("SELECT * FROM data WHERE id = 1")
    assert is_safe_select("  WITH cte AS (SELECT 1) SELECT * FROM cte")


def test_unsafe_queries():
    assert not is_safe_select("DELETE FROM data")
    assert not is_safe_select("SELECT 1; DROP TABLE data")
    assert not is_safe_select("INSERT INTO data VALUES (1)")
