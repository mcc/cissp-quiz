CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    options TEXT NOT NULL, -- JSON string
    answer INTEGER NOT NULL,
    explanation TEXT NOT NULL,
    domain TEXT NOT NULL,
    tags TEXT NOT NULL, -- JSON string
    source TEXT NOT NULL,
    number TEXT
);

CREATE TABLE IF NOT EXISTS quiz_sessions (
    id TEXT PRIMARY KEY,
    start_time TEXT NOT NULL,
    source TEXT NOT NULL,
    name TEXT NOT NULL,
    remark TEXT
);

CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    selected_answer INTEGER NOT NULL,
    time_taken INTEGER NOT NULL,
    notes TEXT,
    FOREIGN KEY (quiz_id) REFERENCES quiz_sessions(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
);

CREATE TABLE IF NOT EXISTS marked_for_review (
    question_id TEXT PRIMARY KEY,
    FOREIGN KEY (question_id) REFERENCES questions(id)
);