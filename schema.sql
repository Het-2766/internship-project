CREATE DATABASE IF NOT EXISTS smart_resume_db;
USE smart_resume_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- 'user' or 'recruiter'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Resumes Table
CREATE TABLE IF NOT EXISTS resumes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content JSON NOT NULL, -- JSON storing personal info, experience, education, skills, projects
    template_type VARCHAR(50) DEFAULT 'modern', -- 'modern', 'classic', 'creative'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Analysis Reports Table
CREATE TABLE IF NOT EXISTS analysis_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resume_id INT NOT NULL,
    user_id INT NOT NULL,
    ats_score INT NOT NULL,
    keywords_found JSON NOT NULL, -- Array of keywords matched
    grammar_issues JSON NOT NULL, -- Detailed spelling/grammar issues
    suggestions JSON NOT NULL,    -- Recommended adjustments/tips
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Companies Table (if recruiter signs up separately or company profile is details)
CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Shortlisted Resumes Table (Recruiter action tracking)
CREATE TABLE IF NOT EXISTS shortlisted_resumes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    resume_id INT NOT NULL,
    score INT NOT NULL,
    status VARCHAR(50) DEFAULT 'applied', -- 'applied', 'reviewed', 'shortlisted', 'rejected'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
