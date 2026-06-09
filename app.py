import os
import re
import json
import random
from groq import Groq
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify
from scheduler import generate_schedule
import PyPDF2

load_dotenv()

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


client = Groq(api_key=os.getenv("GROQ_API_KEY"))


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded."}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    filename = file.filename.lower()

    try:
        if filename.endswith(".pdf"):
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""

        elif filename.endswith(".txt"):
            text = file.read().decode("utf-8")

        else:
            return jsonify({"error": "Only PDF or TXT files are supported."}), 400

        lines = [line.strip() for line in text.replace(",", "\n").split("\n") if line.strip()]
        topics_text = "\n".join(lines)

        return jsonify({"topics": topics_text})

    except Exception as e:
        return jsonify({"error": f"Could not read file: {str(e)}"}), 500


@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json()

    raw_topics = data.get("topics", "")
    days = int(data.get("days", 7))
    hours_per_day = float(data.get("hours_per_day", 2))

    topics = [t.strip() for t in raw_topics.replace(",", "\n").split("\n") if t.strip()]

    if not topics:
        return jsonify({"error": "Please enter at least one topic."}), 400

    schedule = generate_schedule(topics, days, hours_per_day)

    return jsonify({"schedule": schedule, "topics": topics})


@app.route("/quiz", methods=["POST"])
def quiz():
    data = request.get_json()
    topics = data.get("topics", [])

    if not topics:
        return jsonify({"error": "No topics found to generate quiz."}), 400

    try:
        questions = generate_quiz_groq(topics)
        return jsonify({"questions": questions})
    except Exception as e:
        return jsonify({"error": f"Could not generate quiz: {str(e)}"}), 500


def generate_quiz_groq(topics):
    selected = random.sample(topics, min(5, len(topics)))

    prompt = f"""You are a quiz generator. Generate exactly 5 multiple choice questions based on these topics: {', '.join(selected)}.

Rules:
- Each question must test real knowledge about the topic
- Each question must have exactly 4 options
- Only one option must be correct
- Questions should be clear and educational

Respond ONLY in this exact JSON format, no extra text, no markdown backticks:
[
  {{
    "question": "Your question here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "The correct option text here"
  }}
]"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.7,
    )

    text = response.choices[0].message.content.strip()
    text = re.sub(r"```json|```", "", text).strip()

    questions = json.loads(text)

    validated = []
    for q in questions[:5]:
        if "question" in q and "options" in q and "answer" in q:
            validated.append(q)

    return validated


if __name__ == "__main__":
    app.run(debug=True)