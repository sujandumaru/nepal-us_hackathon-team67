#!/usr/bin/env bash
set -e

./.venv/Scripts/python.exe -m uvicorn app.main:app --port 8000