#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load .env if present
if [ -f "$DIR/.env" ]; then
  set -a
  source "$DIR/.env"
  set +a
fi

BACKEND_PORT="${PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

echo "=========================================================="
echo "  Distributed Workflow Orchestration Platform (DWOP)"
echo "=========================================================="

case "$1" in
  worker|agent)
    echo ">> Khởi động Distributed Worker Cluster Daemon..."
    cd "$DIR/src/backend"
    shift
    python3 -m app.worker_agent "$@"
    ;;
  backend|api)
    echo ">> Khởi động FastAPI Backend tại http://127.0.0.1:${BACKEND_PORT} ..."
    cd "$DIR/src/backend"
    python3 -m uvicorn app.main:app --host 0.0.0.0 --port "${BACKEND_PORT}" --reload
    ;;

  frontend|ui)
    echo ">> Khởi động React Frontend Console tại http://localhost:${FRONTEND_PORT} ..."
    cd "$DIR/src/frontend"
    if [ ! -d "node_modules/.bin/vite" ]; then
      echo ">> Đang cài đặt thư viện frontend (npm install)..."
      npm install
    fi
    npm run dev
    ;;

  test)
    echo ">> Chạy toàn bộ 31 bài Pytest của Orchestrator & AI Engine ..."
    cd "$DIR/src/backend"
    python3 -m pytest -v
    ;;

  db|init-db)
    echo ">> Khởi tạo lại Database Schema & Dữ liệu mẫu ..."
    python3 "$DIR/src/database/init_db.py"
    ;;

  *)
    echo "Cách chạy dự án:"
    echo ""
    echo "1. Chạy Backend (Terminal 1):"
    echo "   ./run.sh backend"
    echo ""
    echo "2. Chạy Frontend (Terminal 2):"
    echo "   ./run.sh frontend"
    echo ""
    echo "3. Chạy kiểm thử tự động:"
    echo "   ./run.sh test"
    echo ""
    echo "4. Khởi động Worker kéo việc (Terminal 3):"
    echo "   ./run.sh worker"
    echo ""
    echo "5. Khởi tạo lại CSDL mẫu:"
    echo "   ./run.sh db"
    ;;
esac
