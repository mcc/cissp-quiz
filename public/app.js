let currentQuiz = [];
let currentQuestionIndex = 0;
let quizStartTime;
let currentQuizId;
let answers = [];

async function init() {
    loadTheme();
    await Promise.all([loadDomains(), loadSources()]);
    updateQuestionCount();
}

function loadTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

async function fetchWithPassword(url, options = {}) {
    const password = document.getElementById('app-password').value.trim();
    options.headers = { ...options.headers, 'X-Admin-Password': password };
    const response = await fetch(url, options);
    if (response.status === 403) {
        throw new Error('Incorrect password');
    }
    return response;
}

async function loadDomains() {
    try {
        const response = await fetchWithPassword('/api/domains');
        const domains = await response.json();
        const select = document.getElementById('domain-select');
        select.innerHTML = '<option value="all">All Domains</option>';
        if (!domains || domains.length === 0) {
            select.innerHTML += '<option value="">No domains available</option>';
        } else {
            domains.forEach(domain => {
                select.innerHTML += `<option value="${domain}">${domain}</option>`;
            });
        }
    } catch (err) {
        document.getElementById('password-error').textContent = err.message;
        document.getElementById('password-error').classList.remove('hidden');
    }
}

async function loadSources() {
    try {
        const response = await fetchWithPassword('/api/sources');
        const sources = await response.json();
        const select = document.getElementById('source-select');
        const adminSelect = document.getElementById('admin-source-select');
        const editSelect = document.getElementById('edit-source-select');
        select.innerHTML = '<option value="all">All Sources</option>';
        adminSelect.innerHTML = '<option value="">Select a source</option>';
        editSelect.innerHTML = '<option value="">Select a source</option>';
        if (!sources || sources.length === 0) {
            select.innerHTML += '<option value="">No sources available</option>';
        } else {
            sources.forEach(source => {
                select.innerHTML += `<option value="${source}">${source}</option>`;
                adminSelect.innerHTML += `<option value="${source}">${source}</option>`;
                editSelect.innerHTML += `<option value="${source}">${source}</option>`;
            });
        }
    } catch (err) {
        document.getElementById('password-error').textContent = err.message;
        document.getElementById('password-error').classList.remove('hidden');
    }
}

async function updateQuestionCount() {
    const domain = document.getElementById('domain-select').value;
    const source = document.getElementById('source-select').value;
    try {
        const response = await fetchWithPassword(`/api/quiz?num=9999&domain=${encodeURIComponent(domain)}&source=${encodeURIComponent(source)}`);
        const questions = await response.json();
        document.getElementById('question-count').textContent = `Available questions: ${questions.length}`;
    } catch (err) {
        document.getElementById('question-count').textContent = 'Error fetching question count';
    }
}

async function importQuestions() {
    const fileInput = document.getElementById('import-json');
    const file = fileInput.files[0];
    const errorDiv = document.getElementById('admin-error');
    errorDiv.classList.add('hidden');

    if (!file) {
        errorDiv.textContent = 'Please select a JSON file to import.';
        errorDiv.classList.remove('hidden');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const questions = JSON.parse(e.target.result).map((q, i) => ({
                ...q,
                id: `${i}_${Date.now()}`
            }));
            if (!questions.length) {
                errorDiv.textContent = 'Imported JSON contains no questions.';
                errorDiv.classList.remove('hidden');
                return;
            }

            const response = await fetchWithPassword('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(questions)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error ${response.status}: ${errorText}`);
            }

            await Promise.all([loadDomains(), loadSources()]);
            updateQuestionCount();
            alert('Questions imported successfully!');
        } catch (err) {
            errorDiv.textContent = `Error importing questions: ${err.message}`;
            errorDiv.classList.remove('hidden');
            console.error('Import error:', err);
        }
    };
    reader.readAsText(file);
}

async function startQuiz() {
    const name = document.getElementById('user-name').value.trim();
    const remark = document.getElementById('user-remark').value.trim();
    const numQuestions = document.getElementById('num-questions').value;
    const rangeInput = document.getElementById('question-range').value.trim();
    const domain = document.getElementById('domain-select').value;
    const source = document.getElementById('source-select').value;
    const randomize = document.getElementById('randomize-questions').checked;
    const errorDiv = document.getElementById('password-error');
    errorDiv.classList.add('hidden');

    if (!name) {
        alert('Please enter your name.');
        return;
    }
    if (!numQuestions || numQuestions < 1) {
        alert('Please enter a valid number of questions.');
        return;
    }
    if (!domain || domain === '') {
        alert('No domains available. Please import questions first.');
        return;
    }
    if (!source || source === '') {
        alert('No sources available. Please import questions first.');
        return;
    }

    let startRange = null;
    let endRange = null;
    if (rangeInput) {
        const [start, end] = rangeInput.split('-').map(num => parseInt(num.trim()));
        if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
            alert('Please enter a valid range (e.g., 1-20).');
            return;
        }
        startRange = start;
        endRange = end;
    }

    try {
        const url = `/api/quiz?num=${numQuestions}&domain=${encodeURIComponent(domain)}&source=${encodeURIComponent(source)}&randomize=${randomize}${startRange && endRange ? `&start=${startRange}&end=${endRange}` : ''}`;
        const quizResponse = await fetchWithPassword(url);
        currentQuiz = await quizResponse.json();

        if (!currentQuiz.length) {
            alert('No questions available for the selected domain, source, and range. Please adjust your selection.');
            return;
        }

        const sessionResponse = await fetchWithPassword('/api/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source, name, remark })
        });
        const session = await sessionResponse.json();
        currentQuizId = session.quizId;

        currentQuestionIndex = 0;
        quizStartTime = Date.now();
        answers = [];
        showQuestion();
        toggleScreen('quiz-screen');
    } catch (err) {
        errorDiv.textContent = `Error starting quiz: ${err.message}`;
        errorDiv.classList.remove('hidden');
    }
}

function showQuestion() {
    const q = currentQuiz[currentQuestionIndex];
    document.getElementById('question-num').textContent = `${currentQuestionIndex + 1} of ${currentQuiz.length}`;
    document.getElementById('question-text').innerHTML = `
        ${q.text}
        <div class="question-meta">
            Number: ${q.number || 'N/A'} | Domain: ${q.domain} | Tags: ${q.tags.join(', ')} | Source: ${q.source}
        </div>
    `;

    const optionsDiv = document.getElementById('options');
    optionsDiv.innerHTML = q.options.map((opt, i) => `
        <div>
            <input type="radio" name="answer" value="${i}" id="opt${i}">
            <label for="opt${i}">${opt}</label>
        </div>
    `).join('');

    document.getElementById('mark-for-review').checked = false;
    document.getElementById('question-notes').value = '';
}

async function submitAnswer() {
    const selected = document.querySelector('input[name="answer"]:checked');
    if (!selected) {
        alert('Please select an answer!');
        return;
    }

    const timeTaken = Math.floor((Date.now() - quizStartTime) / 1000);
    const q = currentQuiz[currentQuestionIndex];
    const markForReview = document.getElementById('mark-for-review').checked;
    const notes = document.getElementById('question-notes').value.trim();

    answers.push({
        questionId: q.id,
        selected: parseInt(selected.value),
        timeTaken: timeTaken,
        notes: notes
    });

    try {
        await fetchWithPassword('/api/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quizId: currentQuizId,
                questionId: q.id,
                selectedAnswer: parseInt(selected.value),
                timeTaken: timeTaken,
                notes: notes
            })
        });

        if (markForReview) {
            await fetchWithPassword('/api/marked-for-review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionId: q.id })
            });
        }

        currentQuestionIndex++;
        quizStartTime = Date.now();

        if (currentQuestionIndex < currentQuiz.length) {
            showQuestion();
        } else {
            showResults();
        }
    } catch (err) {
        alert(`Error submitting answer: ${err.message}`);
    }
}

function showResults() {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<h3>Results</h3>';

    currentQuiz.forEach((q, i) => {
        const userAnswer = answers[i].selected;
        const isCorrect = userAnswer === q.answer;

        resultsDiv.innerHTML += `
            <div class="question-container">
                <p><strong>Q${i + 1}:</strong> ${q.text}</p>
                <p class="question-meta">Number: ${q.number || 'N/A'} | Domain: ${q.domain} | Tags: ${q.tags.join(', ')} | Source: ${q.source}</p>
                <ul class="options-list">
                    ${q.options.map((opt, j) => `<li>${opt}${j === q.answer ? ' (Correct)' : ''}</li>`).join('')}
                </ul>
                <p>Your answer: ${q.options[userAnswer]} 
                    <span class="${isCorrect ? 'correct' : 'incorrect'}">
                        (${isCorrect ? 'Correct' : 'Incorrect'})
                    </span>
                </p>
                <p>Explanation: ${q.explanation}</p>
                <p>Time taken: ${answers[i].timeTaken} seconds</p>
                <p>Notes: ${answers[i].notes || 'None'}</p>
            </div>
        `;
    });

    toggleScreen('results-screen');
}

async function showHistory() {
    try {
        const response = await fetchWithPassword('/api/history');
        const history = await response.json();

        const historyDiv = document.getElementById('quiz-history');
        if (!history.length) {
            historyDiv.innerHTML = '<p>No quiz history available.</p>';
        } else {
            historyDiv.innerHTML = history.map(quiz => `
                <div>
                    <h3>Quiz #${quiz.id} - ${quiz.start_time}</h3>
                    <p>Name: ${quiz.name} | Remark: ${quiz.remark || 'None'} | Source: ${quiz.source}</p>
                    <p>Notes Summary: ${quiz.notesSummary || 'None'}</p>
                    ${Object.entries(quiz.stats).map(([domain, stat]) => `
                        <p>${domain}: ${stat.correct}/${stat.total} (${((stat.correct/stat.total)*100).toFixed(1)}%)
                        <button onclick="retakeIncorrect('${quiz.id}', '${domain}', '${quiz.source}')">Retake Incorrect</button>
                        <button onclick="reviewWrongAnswers('${quiz.id}', '${domain}', '${quiz.source}')">Review Wrong Answers</button></p>
                    `).join('')}
                    <button class="danger" onclick="deleteSession('${quiz.id}')">Delete Session</button>
                </div>
            `).join('');
        }

        toggleScreen('history-screen');
    } catch (err) {
        alert(`Error loading history: ${err.message}`);
    }
}

async function deleteSession(quizId) {
    if (!confirm(`Are you sure you want to delete quiz session #${quizId}?`)) {
        return;
    }

    try {
        const response = await fetchWithPassword('/api/delete-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quizId })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error ${response.status}: ${errorText}`);
        }

        alert(`Quiz session #${quizId} deleted successfully.`);
        showHistory();
    } catch (err) {
        alert(`Error deleting session: ${err.message}`);
    }
}

async function showMarkedQuestions() {
    const name = document.getElementById('user-name').value.trim();
    if (!name) {
        alert('Please enter your name to review marked questions.');
        return;
    }

    try {
        const response = await fetchWithPassword(`/api/get-marked-questions?name=${encodeURIComponent(name)}`);
        const markedQuestions = await response.json();

        const markedDiv = document.getElementById('marked-questions-list');
        if (!markedQuestions.length) {
            markedDiv.innerHTML = '<p>No questions marked for review.</p>';
        } else {
            markedDiv.innerHTML = markedQuestions.map((q, i) => `
                <div class="question-container">
                    <p><strong>Q${i + 1}:</strong> ${q.text}</p>
                    <p class="question-meta">Number: ${q.number || 'N/A'} | Domain: ${q.domain} | Tags: ${q.tags.join(', ')} | Source: ${q.source}</p>
                    <ul class="options-list">
                        ${q.options.map((opt, j) => `<li>${opt}${j === q.answer ? ' (Correct)' : ''}</li>`).join('')}
                    </ul>
                    <p>Explanation: ${q.explanation}</p>
                    <p>Notes: ${q.notes.join('; ') || 'None'}</p>
                </div>
            `).join('');
        }

        toggleScreen('marked-questions-screen');
    } catch (err) {
        alert(`Error loading marked questions: ${err.message}`);
    }
}

async function retakeIncorrect(quizId, domain, source) {
    try {
        // Adjust URL based on whether domain/source is "all"
        let url = `/api/retake?quizId=${quizId}`;
        if (domain !== "all") url += `&domain=${encodeURIComponent(domain)}`;
        if (source !== "all") url += `&source=${encodeURIComponent(source)}`;

        const response = await fetchWithPassword(url);
        currentQuiz = await response.json();

        if (!currentQuiz.length) {
            alert('No incorrect questions to retake for this domain and source.');
            return;
        }

        const sessionResponse = await fetchWithPassword('/api/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source, name: document.getElementById('user-name').value.trim(), remark: document.getElementById('user-remark').value.trim() })
        });
        const session = await sessionResponse.json();
        currentQuizId = session.quizId;

        currentQuestionIndex = 0;
        quizStartTime = Date.now();
        answers = [];
        showQuestion();
        toggleScreen('quiz-screen');
    } catch (err) {
        alert(`Error retaking incorrect: ${err.message}`);
    }
}

async function reviewWrongAnswers(quizId, domain, source) {
    try {
        // Adjust URL based on whether domain/source is "all"
        let url = `/api/retake?quizId=${quizId}`;
        if (domain !== "all") url += `&domain=${encodeURIComponent(domain)}`;
        if (source !== "all") url += `&source=${encodeURIComponent(source)}`;

        const response = await fetchWithPassword(url);
        const wrongQuestions = await response.json();

        if (!wrongQuestions.length) {
            alert('No incorrect questions to review for this domain and source.');
            return;
        }

        const resultsDiv = document.getElementById('quiz-history');
        resultsDiv.innerHTML = '<h3>Review Wrong Answers</h3>';

        wrongQuestions.forEach((q, i) => {
            const answer = answers.find(a => a.questionId === q.id) || { selected: -1, notes: '' };
            const userAnswer = answer.selected;

            resultsDiv.innerHTML += `
                <div class="question-container">
                    <p><strong>Q${i + 1}:</strong> ${q.text}</p>
                    <p class="question-meta">Number: ${q.number || 'N/A'} | Domain: ${q.domain} | Tags: ${q.tags.join(', ')} | Source: ${q.source}</p>
                    <ul class="options-list">
                        ${q.options.map((opt, j) => `<li>${opt}${j === q.answer ? ' (Correct)' : ''}</li>`).join('')}
                    </ul>
                    <p>Your answer: ${userAnswer >= 0 ? q.options[userAnswer] : 'Not answered'} 
                        <span class="incorrect">(Incorrect)</span>
                    </p>
                    <p>Explanation: ${q.explanation}</p>
                    <p>Notes: ${answer.notes || 'None'}</p>
                </div>
            `;
        });

        toggleScreen('history-screen');
    } catch (err) {
        alert(`Error reviewing wrong answers: ${err.message}`);
    }
}

function showAdmin() {
    loadSources();
    toggleScreen('admin-screen');
}

async function removeSource() {
    const source = document.getElementById('admin-source-select').value;
    const errorDiv = document.getElementById('admin-error');
    errorDiv.classList.add('hidden');

    if (!source) {
        errorDiv.textContent = 'Please select a source to remove.';
        errorDiv.classList.remove('hidden');
        return;
    }

    if (!confirm(`Are you sure you want to remove all questions from source "${source}"?`)) {
        return;
    }

    try {
        const response = await fetchWithPassword('/api/remove-source', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error ${response.status}: ${errorText}`);
        }

        await Promise.all([loadDomains(), loadSources()]);
        updateQuestionCount();
        alert(`Source "${source}" removed successfully.`);
    } catch (err) {
        errorDiv.textContent = `Error removing source: ${err.message}`;
        errorDiv.classList.remove('hidden');
    }
}

async function removeHistory() {
    const errorDiv = document.getElementById('admin-error');
    errorDiv.classList.add('hidden');

    if (!confirm('Are you sure you want to remove all quiz history? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetchWithPassword('/api/remove-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error ${response.status}: ${errorText}`);
        }

        alert('Quiz history removed successfully.');
    } catch (err) {
        errorDiv.textContent = `Error removing history: ${err.message}`;
        errorDiv.classList.remove('hidden');
    }
}

async function showEditQuestions() {
    const source = document.getElementById('edit-source-select').value;
    const errorDiv = document.getElementById('admin-error');
    errorDiv.classList.add('hidden');

    if (!source) {
        errorDiv.textContent = 'Please select a source to edit questions.';
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetchWithPassword(`/api/get-questions-by-source?source=${encodeURIComponent(source)}`);
        const questions = await response.json();

        const editDiv = document.getElementById('edit-questions-list');
        if (!questions.length) {
            editDiv.innerHTML = '<p>No questions found for this source.</p>';
        } else {
            editDiv.innerHTML = questions.map(q => `
                <div class="question-container" id="question-${q.id}">
                    <label>Text:
                        <textarea id="text-${q.id}">${q.text}</textarea>
                    </label>
                    <label>Options (comma-separated):
                        <input type="text" id="options-${q.id}" value="${q.options.join(',')}">
                    </label>
                    <label>Answer (0-3):
                        <input type="number" id="answer-${q.id}" min="0" max="3" value="${q.answer}">
                    </label>
                    <label>Explanation:
                        <textarea id="explanation-${q.id}">${q.explanation}</textarea>
                    </label>
                    <label>Domain:
                        <input type="text" id="domain-${q.id}" value="${q.domain}">
                    </label>
                    <label>Tags (comma-separated):
                        <input type="text" id="tags-${q.id}" value="${q.tags.join(',')}">
                    </label>
                    <label>Source:
                        <input type="text" id="source-${q.id}" value="${q.source}">
                    </label>
                    <label>Number:
                        <input type="text" id="number-${q.id}" value="${q.number || ''}">
                    </label>
                    <button onclick="updateQuestion('${q.id}')">Update</button>
                    <button class="danger" onclick="deleteQuestion('${q.id}')">Delete</button>
                </div>
            `).join('');
        }

        toggleScreen('edit-questions-screen');
    } catch (err) {
        errorDiv.textContent = `Error loading questions: ${err.message}`;
        errorDiv.classList.remove('hidden');
    }
}

async function updateQuestion(questionId) {
    const text = document.getElementById(`text-${questionId}`).value;
    const options = document.getElementById(`options-${questionId}`).value.split(',').map(opt => opt.trim());
    const answer = parseInt(document.getElementById(`answer-${questionId}`).value);
    const explanation = document.getElementById(`explanation-${questionId}`).value;
    const domain = document.getElementById(`domain-${questionId}`).value;
    const tags = document.getElementById(`tags-${questionId}`).value.split(',').map(tag => tag.trim());
    const source = document.getElementById(`source-${questionId}`).value;
    const number = document.getElementById(`number-${questionId}`).value || null;

    try {
        const response = await fetchWithPassword('/api/update-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: questionId, text, options, answer, explanation, domain, tags, source, number })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error ${response.status}: ${errorText}`);
        }

        alert('Question updated successfully.');
        showEditQuestions();
    } catch (err) {
        alert(`Error updating question: ${err.message}`);
    }
}

async function deleteQuestion(questionId) {
    if (!confirm(`Are you sure you want to delete question #${questionId}?`)) {
        return;
    }

    try {
        const response = await fetchWithPassword('/api/delete-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: questionId })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error ${response.status}: ${errorText}`);
        }

        alert('Question deleted successfully.');
        showEditQuestions();
    } catch (err) {
        alert(`Error deleting question: ${err.message}`);
    }
}

function toggleScreen(screenId) {
    document.querySelectorAll('div[id$="-screen"]').forEach(div => {
        div.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

function showStartScreen() {
    toggleScreen('start-screen');
}

init();