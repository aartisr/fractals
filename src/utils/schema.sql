-- User Challenge Progress table
CREATE TABLE IF NOT EXISTS user_challenge_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  challenge_id INTEGER NOT NULL,
  completed BOOLEAN DEFAULT 0,
  score INTEGER,
  completed_at DATETIME,
  attempts INTEGER DEFAULT 0,
  last_attempt_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users (id),
  FOREIGN KEY (challenge_id) REFERENCES challenges (id),
  UNIQUE (user_id, challenge_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_user ON user_challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_challenge ON user_challenge_progress(challenge_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_completed ON user_challenge_progress(completed);