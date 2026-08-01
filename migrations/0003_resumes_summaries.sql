-- Master library ordering
ALTER TABLE jobs ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE achievements ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Switchable professional summaries (~500 chars enforced in API)
CREATE TABLE IF NOT EXISTS professional_summaries (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  label TEXT NOT NULL,
  body TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_summaries_profile_id ON professional_summaries(profile_id);

-- Versioned resumes
CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  title TEXT NOT NULL,
  label TEXT,
  summary_id TEXT,
  max_bullets INTEGER NOT NULL DEFAULT 5,
  notes TEXT,
  duplicated_from TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (summary_id) REFERENCES professional_summaries(id) ON DELETE SET NULL,
  FOREIGN KEY (duplicated_from) REFERENCES resumes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_resumes_profile_id ON resumes(profile_id);

-- Per-version job inclusion + order
CREATE TABLE IF NOT EXISTS resume_jobs (
  resume_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (resume_id, job_id),
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_resume_jobs_job_id ON resume_jobs(job_id);

-- Per-version achievement (bullet) inclusion + order
CREATE TABLE IF NOT EXISTS resume_achievements (
  resume_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (resume_id, achievement_id),
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_resume_achievements_achievement_id ON resume_achievements(achievement_id);
