# test_api.py
import extract_skills
import analyze
import json

# Mock Request Object
class MockRequest:
    def __init__(self, data_dict):
        self.method = "POST"
        self.body = json.dumps(data_dict).encode('utf-8')

# Test 1: Extract Skills
print("--- Testing Skill Extraction ---")
mock_resume = MockRequest({
    "text": "Sachin Mahajan. Python Developer. Worked at Google from Jan 2020 to Dec 2022. Skills: Python, Django, SQL."
})
response = extract_skills.handler(mock_resume)
print(f"Status: {response['statusCode']}")
print(f"Result: {response['body']}\n")

# Test 2: Analyze Job
print("--- Testing Job Analysis ---")
mock_job = MockRequest({
    "jobDescription": "We need a Python developer with Django and AWS experience. 3+ years required.",
    "userSkills": ["Python", "Django", "SQL"],
    "experienceYears": 2.5
})
response = analyze.handler(mock_job)
print(f"Status: {response['statusCode']}")
print(f"Result: {response['body']}")