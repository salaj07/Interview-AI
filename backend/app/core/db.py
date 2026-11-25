"""
Database abstraction layer with dual-mode storage:
- Connects to MongoDB via Motor if MONGO_URI is set.
- Otherwise provides safe local JSON persistence in `data/reports.json` so the app works out-of-the-box.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from app.core.config import DB_NAME, MONGO_URI

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
LOCAL_REPORTS_FILE = DATA_DIR / "reports.json"


class LocalDatabase:
    """Zero-dependency local persistence for standalone runs."""

    def __init__(self):
        self._reports_file = LOCAL_REPORTS_FILE
        if not self._reports_file.exists():
            self._save_reports({})

    def _load_reports(self) -> dict[str, Any]:
        try:
            if self._reports_file.exists():
                with open(self._reports_file, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Error reading local reports: {e}")
        return {}

    def _save_reports(self, data: dict[str, Any]) -> None:
        try:
            with open(self._reports_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Error saving local reports: {e}")

    class MockCollection:
        def __init__(self, db: LocalDatabase, name: str):
            self.db = db
            self.name = name

        async def find_one(self, filter_dict: dict, projection: dict | None = None) -> dict | None:
            reports = self.db._load_reports()
            session_id = filter_dict.get("session_id")
            if session_id and session_id in reports:
                doc = reports[session_id]
                return doc
            return None

        async def update_one(self, filter_dict: dict, update_dict: dict, upsert: bool = False):
            session_id = filter_dict.get("session_id")
            if not session_id:
                return
            reports = self.db._load_reports()
            set_data = update_dict.get("$set", {})
            reports[session_id] = {**(reports.get(session_id) or {}), **set_data}
            self.db._save_reports(reports)

        async def delete_one(self, filter_dict: dict):
            session_id = filter_dict.get("session_id")
            reports = self.db._load_reports()
            if session_id in reports:
                del reports[session_id]
                self.db._save_reports(reports)

        def find(self, filter_dict: dict | None = None, projection: dict | None = None):
            reports = self.db._load_reports()
            items = list(reports.values())
            user_id = (filter_dict or {}).get("user_id")
            if user_id:
                items = [i for i in items if i.get("user_id") == user_id]

            class AsyncCursor:
                def __init__(self, data):
                    self.data = sorted(
                        data,
                        key=lambda x: str(x.get("created_at", "")),
                        reverse=True
                    )

                def sort(self, *args, **kwargs):
                    return self

                def limit(self, n: int):
                    self.data = self.data[:n]
                    return self

                async def to_list(self, length: int = 100):
                    return self.data[:length]

                def __aiter__(self):
                    self._iter = iter(self.data)
                    return self

                async def __anext__(self):
                    try:
                        return next(self._iter)
                    except StopIteration:
                        raise StopAsyncIteration

            return AsyncCursor(items)

    def __getitem__(self, name: str):
        return self.MockCollection(self, name)


_db_instance = None


def get_db():
    global _db_instance
    if _db_instance is not None:
        return _db_instance

    if MONGO_URI and MONGO_URI.strip():
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            client = AsyncIOMotorClient(MONGO_URI)
            _db_instance = client[DB_NAME]
            logger.info(f"Connected to MongoDB database: {DB_NAME}")
            return _db_instance
        except Exception as e:
            logger.warning(f"Could not connect to MongoDB ({e}), falling back to local JSON storage.")

    _db_instance = LocalDatabase()
    return _db_instance

