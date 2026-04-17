import json
import os
from http.server import BaseHTTPRequestHandler

# Load .env only when running locally
if not os.environ.get("VERCEL"):
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
}


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        for k, v in CORS_HEADERS.items():
            self.send_header(k, v)
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            data = json.loads(body.decode("utf-8"))

            resume_text = data.get("text", "").strip()
            if not resume_text:
                self._respond(400, {"error": "No text provided"})
                return

            prompt = f"""You are an expert HR analyst. Analyze this resume text.
1. Extract technical skills as a list (languages, frameworks, tools, cloud, databases).
2. Calculate total years of experience. Handle gaps and "Present" dates correctly.

Return ONLY valid JSON:
{{
    "skills": ["Python", "Django"],
    "experience_years": 3.0
}}

Resume:
{resume_text[:3000]}
"""
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            result = completion.choices[0].message.content
            self._respond(200, json.loads(result))

        except Exception as e:
            self._respond(500, {"error": str(e)})

    def _respond(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        for k, v in CORS_HEADERS.items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass  # suppress default request logging