from pathlib import Path
import sqlite3

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "app.db"


class ItemCreate(BaseModel):
    name: str = Field(min_length=1)


class ItemUpdate(BaseModel):
    name: str = Field(min_length=1)


app = FastAPI(title="Basic API")


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/items")
def list_items(db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute(
        "SELECT id, name, created_at FROM items ORDER BY id DESC"
    ).fetchall()
    return {"data": [dict(row) for row in rows]}


@app.post("/items", status_code=201)
def create_item(payload: ItemCreate, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.execute("INSERT INTO items (name) VALUES (?)", (payload.name.strip(),))
    db.commit()
    row = db.execute(
        "SELECT id, name, created_at FROM items WHERE id = ?",
        (cursor.lastrowid,),
    ).fetchone()
    return {"data": dict(row)}


@app.get("/items/{item_id}")
def get_item(item_id: int, db: sqlite3.Connection = Depends(get_db)):
    row = db.execute(
        "SELECT id, name, created_at FROM items WHERE id = ?",
        (item_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"data": dict(row)}


@app.put("/items/{item_id}")
def update_item(
    item_id: int, payload: ItemUpdate, db: sqlite3.Connection = Depends(get_db)
):
    cursor = db.execute(
        "UPDATE items SET name = ? WHERE id = ?",
        (payload.name.strip(), item_id),
    )
    db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    row = db.execute(
        "SELECT id, name, created_at FROM items WHERE id = ?",
        (item_id,),
    ).fetchone()
    return {"data": dict(row)}


@app.delete("/items/{item_id}")
def delete_item(item_id: int, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.execute("DELETE FROM items WHERE id = ?", (item_id,))
    db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"data": {"deleted": True}}
