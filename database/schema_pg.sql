-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- 'user' or 'recruiter'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Resumes Table
CREATE TABLE IF NOT EXISTS resumes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content JSON NOT NULL, -- JSON storing personal info, experience, education, skills, projects
    template_type VARCHAR(50) DEFAULT 'modern', -- 'modern', 'classic', 'creative'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Analysis Reports Table
CREATE TABLE IF NOT EXISTS analysis_reports (
    id SERIAL PRIMARY KEY,
    resume_id INT NOT NULL,
    user_id INT NOT NULL,
    ats_score INT NOT NULL,
    keywords_found JSON NOT NULL, -- Array of keywords matched
    grammar_issues JSON NOT NULL, -- Detailed spelling/grammar issues
    suggestions JSON NOT NULL,    -- Recommended adjustments/tips
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Shortlisted Resumes Table
CREATE TABLE IF NOT EXISTS shortlisted_resumes (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL,
    resume_id INT NOT NULL,
    score INT NOT NULL,
    status VARCHAR(50) DEFAULT 'applied', -- 'applied', 'reviewed', 'shortlisted', 'rejected'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
);
