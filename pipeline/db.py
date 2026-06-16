from __future__ import annotations

import os
from functools import lru_cache

from urllib.parse import urlparse

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.database import Database

load_dotenv()


def resolve_db_name() -> str:
    if os.environ.get("MONGODB_DB"):
        return os.environ["MONGODB_DB"]

    uri = os.environ.get("MONGODB_URI", "")
    path = urlparse(uri).path.lstrip("/")
    if path:
        return path.split("/")[0]

    return "estra"


@lru_cache(maxsize=1)
def get_client() -> MongoClient:
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        raise RuntimeError("MONGODB_URI environment variable is required")
    return MongoClient(uri)


def get_db() -> Database:
    client = get_client()
    return client[resolve_db_name()]


def get_config() -> dict:
    config = get_db()["config"].find_one()
    if not config:
        raise RuntimeError("No config document found. Run: pnpm seed")
    return config
