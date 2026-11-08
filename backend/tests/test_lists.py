"""清单与品鉴笔记测试（对齐 TEST_PLAN TC-NOTE-01 ~ 05 / TC-PERM-03）"""

import time
from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from app.main import app
from app.models.collection_list import CollectionList
from app.models.favorite import FavoriteItem
from app.models.tea import Tea
from app.repositories import user_repo


def _unique_username(prefix: str = "noteuser") -> str:
    return f"{prefix}{int(time.time() * 1000000) % 100000000}"


def _register(username: str) -> tuple[TestClient, str]:
    client = TestClient(app)
    resp = client.post("/api/v1/auth/register", json={"username": username, "password": "tea2026"})
    assert resp.status_code == 200
    return client, resp.cookies["tea_session"]


def _create_tea(*, active: bool = True) -> int:
    db = SessionLocal()
    try:
        tea = Tea(
            name=f"笔记茶{int(time.time() * 1000000) % 100000000}",
            category="white",
            origin="福建 测试产区",
            season="明前",
            shape_desc="",
            soup_desc="",
            aroma_desc="",
            taste_desc="",
            is_active=active,
            favorite_count=0,
        )
        db.add(tea)
        db.commit()
        db.refresh(tea)
        return tea.id
    finally:
        db.close()


def _cleanup(tea_ids: list[int], usernames: list[str]) -> None:
    db = SessionLocal()
    try:
        if tea_ids:
            db.query(FavoriteItem).filter(FavoriteItem.tea_id.in_(tea_ids)).delete(
                synchronize_session=False
            )
            db.query(Tea).filter(Tea.id.in_(tea_ids)).delete(synchronize_session=False)
        for name in usernames:
            user = user_repo.get_by_username(db, name)
            if user:
                db.delete(user)
        db.commit()
    finally:
        db.close()


def _user_id(username: str) -> int:
    db = SessionLocal()
    try:
        return user_repo.get_by_username(db, username).id
    finally:
        db.close()


def test_note_01_save_and_read_back():
    username = _unique_username()
    tea_id = _create_tea()
    client, _ = _register(username)
    try:
        client.post(f"/api/v1/favorites/{tea_id}")

        resp = client.put(f"/api/v1/lists/notes/{tea_id}", json={"content": "第一泡豆香突出"})
        assert resp.status_code == 200
        assert resp.json()["data"] == {"tea_id": tea_id, "tasting_note": "第一泡豆香突出"}

        data = client.get("/api/v1/lists").json()["data"]
        assert data["title"] == "我的收藏"
        assert data["tea_count"] == 1
        assert data["items"][0]["tasting_note"] == "第一泡豆香突出"
        assert data["items"][0]["is_available"] is True
        assert data["share"] is None
    finally:
        _cleanup([tea_id], [username])


def test_note_02_cannot_write_note_for_unfavorited_tea():
    username = _unique_username()
    tea_id = _create_tea()
    client, _ = _register(username)
    try:
        resp = client.put(f"/api/v1/lists/notes/{tea_id}", json={"content": "不该保存"})
        assert resp.status_code == 404
        assert resp.json()["code"] == 40430

        db = SessionLocal()
        try:
            assert (
                db.query(FavoriteItem)
                .filter(FavoriteItem.user_id == _user_id(username), FavoriteItem.tea_id == tea_id)
                .count()
                == 0
            )
        finally:
            db.close()
    finally:
        _cleanup([tea_id], [username])


def test_note_03_clear_note_keeps_favorite_item():
    username = _unique_username()
    tea_id = _create_tea()
    client, _ = _register(username)
    try:
        client.post(f"/api/v1/favorites/{tea_id}")
        client.put(f"/api/v1/lists/notes/{tea_id}", json={"content": "原始笔记"})

        cleared = client.put(f"/api/v1/lists/notes/{tea_id}", json={"content": None})
        assert cleared.status_code == 200
        assert cleared.json()["data"]["tasting_note"] is None

        client.put(f"/api/v1/lists/notes/{tea_id}", json={"content": "再来一条"})
        blank = client.put(f"/api/v1/lists/notes/{tea_id}", json={"content": "   "})
        assert blank.status_code == 200
        assert blank.json()["data"]["tasting_note"] is None

        data = client.get("/api/v1/lists").json()["data"]
        assert data["tea_count"] == 1
        assert data["items"][0]["tasting_note"] is None
    finally:
        _cleanup([tea_id], [username])


def test_note_04_length_limit():
    username = _unique_username()
    tea_id = _create_tea()
    client, _ = _register(username)
    try:
        client.post(f"/api/v1/favorites/{tea_id}")

        ok_resp = client.put(f"/api/v1/lists/notes/{tea_id}", json={"content": "好" * 20000})
        assert ok_resp.status_code == 200
        assert len(ok_resp.json()["data"]["tasting_note"]) == 20000

        too_long = client.put(f"/api/v1/lists/notes/{tea_id}", json={"content": "好" * 20001})
        assert too_long.status_code == 400
        assert too_long.json()["code"] == 40000

        huge = client.put(f"/api/v1/lists/notes/{tea_id}", json={"content": "好" * 30000})
        assert huge.status_code == 400
        assert huge.json()["code"] == 40000

        # 原笔记未被截断或破坏
        data = client.get("/api/v1/lists").json()["data"]
        assert len(data["items"][0]["tasting_note"]) == 20000
    finally:
        _cleanup([tea_id], [username])


def test_note_05_notes_are_isolated_between_users():
    username_a = _unique_username("notea")
    username_b = _unique_username("noteb")
    tea_id = _create_tea()
    client_a, _ = _register(username_a)
    client_b, _ = _register(username_b)
    try:
        client_a.post(f"/api/v1/favorites/{tea_id}")
        client_b.post(f"/api/v1/favorites/{tea_id}")
        client_a.put(f"/api/v1/lists/notes/{tea_id}", json={"content": "A-原始笔记"})
        client_b.put(f"/api/v1/lists/notes/{tea_id}", json={"content": "B-新笔记"})

        a_items = client_a.get("/api/v1/lists").json()["data"]["items"]
        b_items = client_b.get("/api/v1/lists").json()["data"]["items"]
        assert a_items[0]["tasting_note"] == "A-原始笔记"
        assert b_items[0]["tasting_note"] == "B-新笔记"
    finally:
        _cleanup([tea_id], [username_a, username_b])


def test_list_title_validation_and_persistence():
    username = _unique_username()
    client, _ = _register(username)
    try:
        created = client.get("/api/v1/lists").json()["data"]
        assert created["title"] == "我的收藏"

        updated = client.put("/api/v1/lists/title", json={"title": "  我的私房茶单  "})
        assert updated.status_code == 200
        assert updated.json()["data"]["title"] == "我的私房茶单"
        assert client.get("/api/v1/lists").json()["data"]["title"] == "我的私房茶单"

        for bad in ("", "茶", "   ", "茶" * 21):
            resp = client.put("/api/v1/lists/title", json={"title": bad})
            assert resp.status_code == 400
            assert resp.json()["code"] == 40000

        assert client.get("/api/v1/lists").json()["data"]["title"] == "我的私房茶单"
    finally:
        _cleanup([], [username])


def test_perm_03_lists_are_user_scoped():
    username_a = _unique_username("perma")
    username_b = _unique_username("permb")
    tea_a = _create_tea()
    tea_b = _create_tea()
    client_a, _ = _register(username_a)
    client_b, _ = _register(username_b)
    try:
        client_a.post(f"/api/v1/favorites/{tea_a}")
        client_b.post(f"/api/v1/favorites/{tea_b}")
        client_b.put(f"/api/v1/lists/notes/{tea_b}", json={"content": "B 的笔记"})

        items_a = client_a.get("/api/v1/lists").json()["data"]["items"]
        items_b = client_b.get("/api/v1/lists").json()["data"]["items"]
        assert [i["tea_id"] for i in items_a] == [tea_a]
        assert [i["tea_id"] for i in items_b] == [tea_b]

        # A 未收藏 tea_b，写笔记应 40430，B 的笔记不变
        resp = client_a.put(f"/api/v1/lists/notes/{tea_b}", json={"content": "篡改"})
        assert resp.status_code == 404
        assert resp.json()["code"] == 40430
        assert (
            client_b.get("/api/v1/lists").json()["data"]["items"][0]["tasting_note"] == "B 的笔记"
        )
    finally:
        _cleanup([tea_a, tea_b], [username_a, username_b])


def test_list_get_or_create_is_concurrent_safe():
    username = _unique_username("listconc")
    client, session = _register(username)
    try:

        def _do_get(_: int) -> int:
            c = TestClient(app)
            c.cookies.set("tea_session", session)
            r = c.get("/api/v1/lists")
            assert r.status_code == 200
            return r.json()["data"]["id"]

        with ThreadPoolExecutor(max_workers=20) as pool:
            ids = list(pool.map(_do_get, range(20)))

        assert len(set(ids)) == 1
        db = SessionLocal()
        try:
            assert (
                db.query(CollectionList)
                .filter(CollectionList.user_id == _user_id(username))
                .count()
                == 1
            )
        finally:
            db.close()
    finally:
        _cleanup([], [username])


def test_list_endpoints_require_login():
    c = TestClient(app)
    assert c.get("/api/v1/lists").status_code == 401
    assert c.put("/api/v1/lists/title", json={"title": "测试标题"}).status_code == 401
    assert c.put("/api/v1/lists/notes/1", json={"content": "x"}).status_code == 401
