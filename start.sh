#!/bin/bash

# Заголовок для красоты
echo "🚀 Запускаем Python Task Manager 2030..."

# Запускаем Flask backend в фоновом режиме
echo "▶️  Запуск Backend (Flask)..."
(cd backend && source venv/bin/activate && python app.py) &
BACKEND_PID=$!

# Небольшая пауза, чтобы бэкенд успел запуститься
sleep 3

# Запускаем React frontend
echo "▶️  Запуск Frontend (React)..."
npm run dev -- --host

# Когда фронтенд будет остановлен (Ctrl+C), останавливаем и бэкенд
echo "⏹️  Остановка Backend..."
kill $BACKEND_PID