import { mkdirSync } from "node:fs";
import { Database } from "bun:sqlite";

const port = Number(process.env.PORT ?? 3000);
const dataDir = `${import.meta.dir}/../data`;
const dbPath = `${dataDir}/app.db`;

mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const listItems = db.query("SELECT id, name, created_at FROM items ORDER BY id DESC");
const getItem = db.query("SELECT id, name, created_at FROM items WHERE id = ?");
const createItem = db.query("INSERT INTO items (name) VALUES (?)");
const updateItem = db.query("UPDATE items SET name = ? WHERE id = ?");
const deleteItem = db.query("DELETE FROM items WHERE id = ?");

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

async function readBody(request: Request) {
  const text = await request.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

Bun.serve({
  port,
  fetch: async (request) => {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ status: "ok" });
    }

    if (url.pathname === "/items" && request.method === "GET") {
      return json({ data: listItems.all() });
    }

    if (url.pathname === "/items" && request.method === "POST") {
      try {
        const body = await readBody(request);
        const name = typeof body.name === "string" ? body.name.trim() : "";

        if (!name) {
          return json({ error: "name is required" }, 400);
        }

        const result = createItem.run(name);
        const item = getItem.get(result.lastInsertRowid) as
          | { id: number; name: string; created_at: string }
          | undefined;

        return json({ data: item }, 201);
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : "Bad request" }, 400);
      }
    }

    const match = url.pathname.match(/^\/items\/(\d+)$/);

    if (!match) {
      return json({ error: "Not found" }, 404);
    }

    const id = Number(match[1]);

    if (request.method === "GET") {
      const item = getItem.get(id);

      if (!item) {
        return json({ error: "Item not found" }, 404);
      }

      return json({ data: item });
    }

    if (request.method === "PUT") {
      try {
        const body = await readBody(request);
        const name = typeof body.name === "string" ? body.name.trim() : "";

        if (!name) {
          return json({ error: "name is required" }, 400);
        }

        const result = updateItem.run(name, id);

        if (result.changes === 0) {
          return json({ error: "Item not found" }, 404);
        }

        const item = getItem.get(id);
        return json({ data: item });
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : "Bad request" }, 400);
      }
    }

    if (request.method === "DELETE") {
      const result = deleteItem.run(id);

      if (result.changes === 0) {
        return json({ error: "Item not found" }, 404);
      }

      return json({ data: { deleted: true } });
    }

    return json({ error: "Method not allowed" }, 405);
  },
});

console.log(`Node API running on http://localhost:${port}`);
