# test_api.py
import extract_skills
import analyze
import json

# Mock Request Object
class MockRequest:
    def __init__(self, data_dict):
        self.method = "POST"
        self.data = json.dumps(data_dict).encode('utf-8')

# Test 1: Extract Skills
print("--- Testing Skill Extraction ---")
mock_resume = MockRequest({
    "text": "Sachin Mahajan. Python Developer. Worked at Google from Jan 2020 to Dec 2022. Skills: Python, Django, SQL."
})
result, status = extract_skills.main(mock_resume)
print(f"Status: {status}")
print(f"Result: {result}\n")

# Test 2: Analyze Job
print("--- Testing Job Analysis ---")
mock_job = MockRequest({
    "jobDescription": "We need a Python developer with Django and AWS experience. 3+ years required.",
    "userSkills": ["Python", "Django", "SQL"],
    "experienceYears": 2.5
})
result, status = analyze.main(mock_job)
print(f"Status: {status}")
print(f"Result: {result}")