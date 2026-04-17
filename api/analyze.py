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

            jd_text = data.get("jobDescription", "").strip()
            user_skills = data.get("userSkills", [])
            user_exp = data.get("experienceYears", 0)

            if not jd_text or not user_skills:
                self._respond(400, {"error": "Missing jobDescription or userSkills"})
                return

            prompt = f"""You are an expert technical recruiter and career coach.

Compare the candidate's profile to the Job Description below.

Candidate:
- Skills: {json.dumps(user_skills)}
- Years of Experience: {user_exp}

Job Description:
{jd_text[:3000]}

Return ONLY valid JSON:
{{
    "matchScore": 75,
    "matchingSkills": ["Python", "AWS"],
    "missingSkills": ["Docker", "Kubernetes"],
    "summary": "Two sentence fit summary.",
    "actionableTips": ["Tip 1.", "Tip 2.", "Tip 3."]
}}

matchScore must be an integer 0-100.
"""
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=700,
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