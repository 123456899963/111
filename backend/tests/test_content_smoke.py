"""批次五后端冒烟测试

用例：CONT-01 ~ CONT-05
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_cont_01_list_types():
    """游客访问 /content-types -> 返回 5 板块。"""
    r = client.get("/api/v1/content-types")
    assert r.status_code == 200
    d = r.json()
    assert d["code"] == 0
    types = d["data"]
    assert len(types) == 5
    codes = {t["code"] for t in types}
    assert codes == {"teaware", "origin", "culture", "brand", "knowledge"}


def test_cont_02_list_contents_public():
    """游客访问 /contents -> 空表 total=0。"""
    r = client.get("/api/v1/contents?type=teaware")
    assert r.status_code == 200
    d = r.json()
    assert d["code"] == 0
    assert d["data"]["total"] == 0
    assert d["data"]["items"] == []


def test_cont_03_invalid_type_rejected():
    """非法 type 参数 -> 400/40000。"""
    r = client.get("/api/v1/contents?type=INVALID")
    assert r.status_code == 400
    assert r.json()["code"] == 40000


def test_cont_04_item_not_found():
    """不存在的条目 -> 404/40460。"""
    r = client.get("/api/v1/contents/9999")
    assert r.status_code == 404
    assert r.json()["code"] == 40460


def test_cont_05_admin_auth_required():
    """管理员端点未登录 -> 401。"""
    r = client.get("/api/v1/admin/contents")
    assert r.status_code == 401

    r = client.post("/api/v1/admin/contents", json={})
    assert r.status_code == 401

    r = client.put("/api/v1/admin/contents/1", json={})
    assert r.status_code == 401

    r = client.delete("/api/v1/admin/contents/1")
    assert r.status_code == 401
