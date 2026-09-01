"""
CareerIntel Real-Data Server & 6-Agent API Bridge
"""
import http.server
import socketserver
import json
import os
import sys
import re

PORT = 8000
FRONTEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(FRONTEND_DIR)

SKILL_TAXONOMY = {
    "Python": ["python", "pandas", "numpy", "pytest"],
    "SQL & Databases": ["sql", "postgresql", "postgres", "mysql", "sqlite"],
    "Big Data": ["spark", "pyspark", "hadoop", "databricks"],
    "Machine Learning": ["scikit-learn", "sklearn", "pytorch", "tensorflow", "ml", "machine learning"],
    "MLOps & Deployment": ["docker", "kubernetes", "mlflow", "fastapi", "ci/cd", "deployment"],
    "Data Visualization": ["power bi", "tableau", "matplotlib", "seaborn", "dashboards"],
    "Cloud Computing": ["aws", "azure", "gcp", "s3", "ec2"],
    "Software Engineering": ["git", "github", "data structures", "algorithms", "oop"]
}

def parse_resume_text(text):
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    extracted_skills = []
    
    for idx, line in enumerate(lines, start=1):
        line_lower = line.lower()
        for skill_category, keywords in SKILL_TAXONOMY.items():
            for kw in keywords:
                if re.search(r'\b' + re.escape(kw) + r'\b', line_lower):
                    confidence = 95 if len(kw) > 3 else 85
                    extracted_skills.append({
                        "name": kw.title() if len(kw) <= 4 else kw.capitalize(),
                        "category": skill_category,
                        "confidence": confidence,
                        "sourceLine": idx,
                        "lineText": line
                    })

    # Deduplicate skills
    seen = set()
    unique_skills = []
    for s in extracted_skills:
        if s["name"].lower() not in seen:
            seen.add(s["name"].lower())
            unique_skills.append(s)
            
    return {
        "lines": [{"line": idx+1, "text": line} for idx, line in enumerate(lines)],
        "extracted_skills": unique_skills
    }


class CareerIntelHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def do_GET(self):
        if self.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "engine": "AI Career Engine Ready"}).encode('utf-8'))
            return
        return super().do_GET()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else "{}"
        
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        if self.path == '/api/extract-resume':
            resume_text = payload.get("resume_text", "")
            result = parse_resume_text(resume_text)
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))
            return

        if self.path == '/api/pipeline':
            try:
                sys.path.insert(0, os.path.join(PROJECT_ROOT, "ai-career-engine"))
                from orchestrator.agent_orchestrator import AgentOrchestrator

                # Use incoming dynamic candidate or fallback to structure
                candidate_data = payload.get("candidate", {})
                target_role_data = payload.get("target_role", {})

                input_data = {
                    "candidate": {
                        "candidate_id": candidate_data.get("id", "user_active"),
                        "name": candidate_data.get("name", "User Candidate"),
                        "email": candidate_data.get("email", "user@email.com"),
                        "current_role": candidate_data.get("current_role", "Professional"),
                        "skills": candidate_data.get("skills", [
                            {"name": "Python", "proficiency": 0.8, "evidence": "Resume analysis"},
                            {"name": "SQL", "proficiency": 0.7, "evidence": "Resume analysis"}
                        ]),
                        "experience": candidate_data.get("experience", []),
                        "education": candidate_data.get("education", [])
                    },
                    "target_role": {
                        "name": target_role_data.get("name", "Senior Data Scientist")
                    }
                }

                orchestrator = AgentOrchestrator()
                results = orchestrator.run_career_pipeline(input_data)

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(results).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

def run_server():
    os.chdir(FRONTEND_DIR)
    with socketserver.TCPServer(("", PORT), CareerIntelHandler) as httpd:
        print(f"[*] CareerIntel UI Server running at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[*] Server stopped.")

if __name__ == "__main__":
    run_server()
