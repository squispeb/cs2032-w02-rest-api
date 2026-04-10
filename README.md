# Run Instructions

## Install Tools

### Bun

Install from the official site:
`https://bun.sh/docs/installation`

Common install command:
```bash
curl -fsSL https://bun.sh/install | bash
```

Verify with:
```bash
bun --version
```

### uv

Install from the official site:
`https://docs.astral.sh/uv/getting-started/installation/`

Common install command:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Verify with:
```bash
uv --version
```

## Node API

Requires `bun`.

1. `cd node-api`
2. `bun install`
3. `bun run dev`

The Node API runs on `http://localhost:3000` by default.

## Python API

Requires `uv`.

1. `cd python-api`
2. `uv sync`
3. `uv run uvicorn app.main:app --reload --port 5000`

The Python API runs on `http://localhost:5000` by default.

## Endpoints

- `GET /health`
- `GET /items`
- `POST /items`
- `GET /items/{id}`
- `PUT /items/{id}`
- `DELETE /items/{id}`
