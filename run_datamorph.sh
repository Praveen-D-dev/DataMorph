#!/usr/bin/env bash

echo "========================================================"
echo "       DATAMORPH: AI Adaptive Dashboard Framework       "
echo "========================================================"
echo "Starting local services..."
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# 1. Start Python AI Engine (Port 5005)
echo "[1/3] Starting Python AI Engine on http://127.0.0.1:5005 ..."
(cd "$SCRIPT_DIR/ai-engine" && python server.py) &
PID_AI=$!

# 2. Start Next.js Backend API (Port 3001)
echo "[2/3] Starting Next.js API on http://localhost:3001 ..."
(cd "$SCRIPT_DIR/backend/nextjs-api" && npm run dev) &
PID_BACKEND=$!

# 3. Start Angular Frontend UI (Port 4200)
echo "[3/3] Starting Angular Desktop Frontend on http://localhost:4200 ..."
(cd "$SCRIPT_DIR/frontend/angular-app" && npm start) &
PID_FRONTEND=$!

echo ""
echo "========================================================"
echo "DataMorph services running in background:"
echo " - AI Engine:   http://127.0.0.1:5005"
echo " - Next.js API: http://localhost:3001"
echo " - Frontend:    http://localhost:4200"
echo "========================================================"
echo "Press Ctrl+C to terminate all services."

trap "kill $PID_AI $PID_BACKEND $PID_FRONTEND; exit" SIGINT SIGTERM
wait
