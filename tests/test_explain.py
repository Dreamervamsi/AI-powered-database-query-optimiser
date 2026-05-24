from services.explain import is_safe_select
from services.sql_params import inline_positional_params


def test_safe_select():
    assert is_safe_select("SELECT * FROM data WHERE id = 1")
    assert is_safe_select("  WITH cte AS (SELECT 1) SELECT * FROM cte")


def test_unsafe_queries():
    assert not is_safe_select("DELETE FROM data")
    assert not is_safe_select("SELECT 1; DROP TABLE data")
    assert not is_safe_select("INSERT INTO data VALUES (1)")


def test_inline_positional_params():
    sql = "SELECT * FROM data WHERE data.email = $1::VARCHAR"
    assert inline_positional_params(sql, ("user@example.com",)) == (
        "SELECT * FROM data WHERE data.email = 'user@example.com'"
    )
    assert inline_positional_params("SELECT 1", ()) == "SELECT 1"

