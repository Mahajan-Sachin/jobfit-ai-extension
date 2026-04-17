import json
import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables from .env file (for local development)
load_dotenv()

# Initialize Groq client using the API Key from Environment Variables
# This works locally (via .env) and on Vercel (via Dashboard Settings)
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def main(request):
    # Only allow POST requests
    if request.method != "POST":
        return {"error": "Method not allowed"}, 405

    try:
        data = json.loads(request.data)
        resume_text = data.get("text", "")

        if not resume_text:
            return {"error": "No resume text provided"}, 400

        # Prompt for Skill Extraction & Experience Calculation
        prompt = f"""
        You are an expert HR analyst. Analyze the following resume text.
        
        1. Extract a list of technical skills (programming languages, frameworks, tools, databases).
        2. Calculate the total years of professional experience. 
           - If dates are like 'Dec 2017 - Jan 2020', count the duration.
           - If 'Present' or 'Current' is used, use today's date.
           - Subtract gaps between jobs.
           - Return only the numeric value (e.g., 4.5).
        
        Return ONLY a valid JSON object with this structure:
        {{
            "skills": ["Skill1", "Skill2"],
            "experience_years": 0.0
        }}

        Resume Text:
        {resume_text[:3000]} 
        """

        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant", # Fast and cheap model
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2, # Low temp for consistent JSON output
            max_tokens=500,
            response_format={"type": "json_object"} # Force JSON output
        )

        result = completion.choices[0].message.content
        
        # Parse and return the JSON
        return json.loads(result), 200

    except Exception as e:
        return {"error": str(e)}, 500