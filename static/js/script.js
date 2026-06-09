let currentTopics = [];

// ── FILE UPLOAD ──────────────────────────────────────────────────────────────
async function uploadFile() {
    const fileInput = document.getElementById("fileInput");
    const uploadStatus = document.getElementById("uploadStatus");
    const file = fileInput.files[0];

    if (!file) return;

    uploadStatus.innerHTML = `<p class="upload-success">⏳ Reading file...</p>`;

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (data.error) {
            uploadStatus.innerHTML = `<p class="upload-error">⚠️ ${data.error}</p>`;
            return;
        }

        document.getElementById("topics").value = data.topics;
        uploadStatus.innerHTML = `<p class="upload-success">✅ File uploaded! Topics extracted successfully.</p>`;

    } catch (error) {
        uploadStatus.innerHTML = `<p class="upload-error">⚠️ Upload failed. Please try again.</p>`;
    }
}

// ── GENERATE SCHEDULE ────────────────────────────────────────────────────────
async function generateSchedule() {
    const topics = document.getElementById("topics").value;
    const days = document.getElementById("days").value;
    const hours = document.getElementById("hours").value;
    const output = document.getElementById("output");
    const btn = document.getElementById("generateBtn");
    const quizSection = document.getElementById("quizSection");

    if (!topics.trim()) {
        output.innerHTML = `<div class="error-msg">⚠️ Please enter at least one topic.</div>`;
        return;
    }

    btn.disabled = true;
    btn.textContent = "Generating...";
    output.innerHTML = "";
    quizSection.style.display = "none";

    try {
        const response = await fetch("/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                topics: topics,
                days: parseInt(days),
                hours_per_day: parseFloat(hours)
            })
        });

        const data = await response.json();

        if (data.error) {
            output.innerHTML = `<div class="error-msg">⚠️ ${data.error}</div>`;
            return;
        }

        // Save topics for quiz
        currentTopics = data.topics;

        // Build schedule HTML
        let html = `<p class="schedule-title">📅 Your ${days}-Day Study Schedule</p>`;

        data.schedule.forEach(day => {
            html += `<div class="day-card">`;
            html += `<div class="day-label">📖 ${day.label}</div>`;
            day.tasks.forEach(task => {
                html += `
                    <div class="task-item">
                        <span class="task-topic">✅ ${task.topic}</span>
                        <span class="task-hours">${task.hours} hrs</span>
                    </div>`;
            });
            html += `</div>`;
        });

        output.innerHTML = html;

        // Show quiz section
        quizSection.style.display = "block";

    } catch (error) {
        output.innerHTML = `<div class="error-msg">⚠️ Something went wrong. Please try again.</div>`;
    } finally {
        btn.disabled = false;
        btn.textContent = "Generate Schedule";
    }
}

// ── GENERATE QUIZ ────────────────────────────────────────────────────────────
async function generateQuiz() {
    const quizOutput = document.getElementById("quizOutput");
    const quizBtn = document.getElementById("quizBtn");

    if (currentTopics.length < 4) {
        quizOutput.innerHTML = `<div class="error-msg">⚠️ Please enter at least 4 topics to generate a quiz.</div>`;
        return;
    }

    quizBtn.disabled = true;
    quizBtn.textContent = "Generating Quiz...";
    quizOutput.innerHTML = "";

    try {
        const response = await fetch("/quiz", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topics: currentTopics })
        });

        const data = await response.json();

        if (data.error) {
            quizOutput.innerHTML = `<div class="error-msg">⚠️ ${data.error}</div>`;
            return;
        }

        renderQuiz(data.questions);

    } catch (error) {
        quizOutput.innerHTML = `<div class="error-msg">⚠️ Something went wrong. Please try again.</div>`;
    } finally {
        quizBtn.disabled = false;
        quizBtn.textContent = "Generate Quiz";
    }
}

// ── RENDER QUIZ ──────────────────────────────────────────────────────────────
function renderQuiz(questions) {
    const quizOutput = document.getElementById("quizOutput");
    let score = 0;
    let answered = 0;
    const total = questions.length;

    let html = "";
    questions.forEach((q, index) => {
        html += `<div class="quiz-question" id="q${index}">`;
        html += `<p>Q${index + 1}. ${q.question}</p>`;
        q.options.forEach(option => {
            html += `
                <button class="option-btn"
                    onclick="checkAnswer(this, '${option}', '${q.answer}', ${index})">
                    ${option}
                </button>`;
        });
        html += `</div>`;
    });

    quizOutput.innerHTML = html;

    // Attach score tracker
    window.quizScore = 0;
    window.quizAnswered = 0;
    window.quizTotal = total;
}

// ── CHECK ANSWER ─────────────────────────────────────────────────────────────
function checkAnswer(btn, selected, correct, qIndex) {
    const questionDiv = document.getElementById(`q${qIndex}`);
    const allBtns = questionDiv.querySelectorAll(".option-btn");

    // Disable all options for this question
    allBtns.forEach(b => b.disabled = true);

    if (selected === correct) {
        btn.classList.add("correct");
        window.quizScore++;
    } else {
        btn.classList.add("wrong");
        // Highlight correct answer
        allBtns.forEach(b => {
            if (b.textContent.trim() === correct) {
                b.classList.add("correct");
            }
        });
    }

    window.quizAnswered++;

    // Show score when all answered
    if (window.quizAnswered === window.quizTotal) {
        const percent = Math.round((window.quizScore / window.quizTotal) * 100);
        const emoji = percent >= 80 ? "🎉" : percent >= 50 ? "👍" : "📖";

        const scoreCard = document.createElement("div");
        scoreCard.className = "score-card";
        scoreCard.innerHTML = `
            <h3>${emoji} Quiz Complete!</h3>
            <p>You scored <strong>${window.quizScore} / ${window.quizTotal}</strong> (${percent}%)</p>
            <p style="margin-top:8px; opacity:0.85;">
                ${percent >= 80 ? "Excellent work! You know your syllabus well." :
                  percent >= 50 ? "Good effort! Review the topics you missed." :
                  "Keep studying — you'll get there!"}
            </p>
        `;
        document.getElementById("quizOutput").appendChild(scoreCard);
    }
}