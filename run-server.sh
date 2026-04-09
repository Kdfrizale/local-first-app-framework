#!/bin/bash
# Helper script to run the reading log example

echo "🚀 Starting Local-First Apps Development Server..."
echo ""
echo "Starting server at http://localhost:8000"
echo ""
echo "Open your browser to:"
echo "  📚 Reading Log: http://localhost:8000/framework/examples/reading-log/"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd "$(dirname "$0")"
python3 -m http.server 8000
