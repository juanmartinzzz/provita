-- ProVita career story schema
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  company TEXT,
  headline TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  employment_type TEXT NOT NULL DEFAULT 'full_time',
  start_date TEXT NOT NULL,
  end_date TEXT,
  is_current INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_jobs_profile_id ON jobs(profile_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  impact_metric TEXT,
  tags TEXT,
  achieved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_achievements_job_id ON achievements(job_id);

-- Seed demo profile + career story for local dashboard
INSERT INTO profiles (id, display_name, email, company, headline)
VALUES (
  'profile_demo',
  'Alex Rivera',
  'alex@provita.app',
  'ProVita',
  'Product engineer building career systems'
);

INSERT INTO jobs (id, profile_id, company, title, location, employment_type, start_date, end_date, is_current, summary) VALUES
  ('job_1', 'profile_demo', 'Northline Systems', 'Senior Product Engineer', 'Remote', 'full_time', '2023-03-01', NULL, 1, 'Leading career platform foundations and design systems.'),
  ('job_2', 'profile_demo', 'Cascade Labs', 'Full-Stack Engineer', 'New York, NY', 'full_time', '2020-06-01', '2023-02-28', 0, 'Shipped analytics tooling and internal ops dashboards.'),
  ('job_3', 'profile_demo', 'Harbor Collective', 'Frontend Engineer', 'Brooklyn, NY', 'contract', '2018-01-15', '2020-05-30', 0, 'Built high-contrast marketing and product UI kits.'),
  ('job_4', 'profile_demo', 'Pixel Foundry', 'UI Engineer Intern', 'Boston, MA', 'internship', '2017-05-01', '2017-12-20', 0, 'Prototyped 8-bit inspired interface experiments.');

INSERT INTO achievements (id, job_id, title, description, impact_metric, tags, achieved_at) VALUES
  ('ach_1', 'job_1', 'Career timeline v1', 'Shipped expandable job timeline with multi-column sort.', '3.2x faster story drafting', 'product,ux', '2024-11-12'),
  ('ach_2', 'job_1', 'D1 migration path', 'Established schema for jobs and achievements on Cloudflare D1.', '0 cold-start regressions', 'infra,data', '2025-02-03'),
  ('ach_3', 'job_2', 'Ops dashboard', 'Replaced spreadsheet workflows with live ops views.', '40% fewer support tickets', 'analytics', '2021-09-18'),
  ('ach_4', 'job_2', 'API reliability', 'Hardened edge routes and retry policies.', '99.95% uptime quarter', 'reliability', '2022-04-01'),
  ('ach_5', 'job_3', 'Design system', 'Delivered monochrome component kit with red accents.', '12 product surfaces', 'design-system', '2019-08-22'),
  ('ach_6', 'job_4', 'Glyph icon set', 'Created dot-matrix icon language for internal tools.', '48 glyphs', 'brand,icons', '2017-10-10');
