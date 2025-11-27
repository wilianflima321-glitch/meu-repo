#!/usr/bin/env python3
"""
Simple HTTP server for AI IDE
Serves static files and provides mock API endpoints
"""

import http.server
import socketserver
import json
import time
from urllib.parse import urlparse, parse_qs
import os

PORT = 3000

class IDERequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Serve static files
        return super().do_GET()
    
    def do_POST(self):
        # Parse URL
        parsed_path = urlparse(self.path)
        
        # API endpoints
        if parsed_path.path.startswith('/api/agent/'):
            self.handle_agent_request(parsed_path)
        else:
            self.send_error(404, "Not Found")
    
    def handle_agent_request(self, parsed_path):
        # Get agent type from path
        agent_type = parsed_path.path.split('/')[-1]
        
        # Read request body
        content_length = int(self.headers['Content-Length'])
        body = self.rfile.read(content_length)
        data = json.loads(body.decode('utf-8'))
        
        # Simulate processing delay
        time.sleep(0.5)
        
        # Mock responses
        responses = {
            'architect': {
                'response': f"🏗️ Architect Agent: Analyzing '{data.get('input', '')}'...\n\nRecommendations:\n- Use microservices architecture\n- Implement event-driven design\n- Add caching layer\n- Use database sharding",
                'suggestions': ['microservices', 'event-driven', 'caching', 'sharding']
            },
            'coder': {
                'response': f"💻 Coder Agent: Generating code for '{data.get('input', '')}'...\n\n```javascript\nfunction example() {{\n  console.log('Generated code');\n  return true;\n}}\n```",
                'code': "function example() { console.log('Generated code'); return true; }"
            },
            'research': {
                'response': f"🔍 Research Agent: Researching '{data.get('input', '')}'...\n\nFindings:\n- Latest best practices\n- Industry standards\n- Performance benchmarks",
                'sources': ['source1', 'source2', 'source3']
            },
            'dream': {
                'response': f"🎨 AI Dream System: Creating '{data.get('input', '')}'...\n\nGenerated creative content with 95% quality score.",
                'quality': 0.95
            },
            'memory': {
                'response': f"🧠 Character Memory Bank: Storing '{data.get('input', '')}'...\n\nMemory saved with 99% consistency.",
                'consistency': 0.99
            }
        }
        
        # Get response for agent type
        response_data = responses.get(agent_type, {
            'response': f"Agent {agent_type} processed: {data.get('input', '')}",
            'status': 'ok'
        })
        
        # Send response
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(response_data).encode('utf-8'))
    
    def do_OPTIONS(self):
        # Handle CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def run_server():
    # Change to script directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), IDERequestHandler) as httpd:
        print(f"🚀 AI IDE Server running at http://localhost:{PORT}")
        print(f"📂 Serving files from: {os.getcwd()}")
        print(f"✨ Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Server stopped")

if __name__ == "__main__":
    run_server()
