USE smart_resume_db;

-- Delete existing records to allow re-seeding
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM shortlisted_resumes;
DELETE FROM analysis_reports;
DELETE FROM resumes;
DELETE FROM companies;
DELETE FROM users;

ALTER TABLE shortlisted_resumes AUTO_INCREMENT = 1;
ALTER TABLE analysis_reports AUTO_INCREMENT = 1;
ALTER TABLE resumes AUTO_INCREMENT = 1;
ALTER TABLE companies AUTO_INCREMENT = 1;
ALTER TABLE users AUTO_INCREMENT = 1;
SET FOREIGN_KEY_CHECKS = 1;


-- 1. Insert Users (Password is 'password123', hashed with bcrypt)
INSERT INTO users (id, name, email, password, role) VALUES
(1, 'Alice Smith', 'alice@example.com', '$2a$10$e0MYz4wQ1Bf/dK2eHlC95.hJ.JpSjQjZ36/jI21tH72eWc4Hn5oWq', 'user'),
(2, 'Bob Johnson', 'bob@example.com', '$2a$10$e0MYz4wQ1Bf/dK2eHlC95.hJ.JpSjQjZ36/jI21tH72eWc4Hn5oWq', 'user'),
(3, 'Charlie Brown', 'charlie@example.com', '$2a$10$e0MYz4wQ1Bf/dK2eHlC95.hJ.JpSjQjZ36/jI21tH72eWc4Hn5oWq', 'user');

-- 2. Insert Resumes
-- Content is a JSON string containing the structured resume information.
INSERT INTO resumes (id, user_id, title, content, template_type) VALUES
(1, 1, 'Alice - Full Stack Engineer Resume', 
'{"personal_info": {"name": "Alice Smith", "email": "alice@example.com", "phone": "123-456-7890", "location": "New York, NY", "website": "https://alice.dev", "summary": "Experienced Full Stack Engineer with a passion for building scalable web applications. Proficient in Node.js, React, and Python AI integration."}, "education": [{"school": "State University", "degree": "B.S. Computer Science", "year": "2020"}], "experience": [{"company": "Tech Corp", "role": "Software Engineer", "duration": "2020 - Present", "description": "Developed microservices in Node.js and improved search performance by 40% using Redis. Collaborated with AI team to deploy Python scoring pipelines."}], "skills": ["JavaScript", "Node.js", "React", "Python", "SQL", "Docker", "Git"], "projects": [{"title": "Cloud Portfolio", "description": "A serverless portfolio app utilizing AWS Lambda and DynamoDB."}]}', 
'modern'),

(2, 2, 'Bob - Frontend Developer Resume', 
'{"personal_info": {"name": "Bob Johnson", "email": "bob@example.com", "phone": "987-654-3210", "location": "San Francisco, CA", "website": "https://bobcodes.com", "summary": "Creative Frontend Developer specializing in responsive interfaces and user experience. 3+ years of experience with React, Tailwind, and CSS animations."}, "education": [{"school": "Design College", "degree": "B.F.A. Interactive Media", "year": "2021"}], "experience": [{"company": "Pixel Studio", "role": "UI Engineer", "duration": "2021 - Present", "description": "Led frontend redesign for main SaaS dashboard, increasing user retention by 15%. Integrated analytical charts using Chart.js."}], "skills": ["HTML5", "CSS3", "JavaScript", "React", "Tailwind CSS", "Figma", "Redux"], "projects": [{"title": "Design System", "description": "Built an internal design library of reusable React components."}]}', 
'creative'),

(3, 3, 'Charlie - Python & Data Analyst Resume', 
'{"personal_info": {"name": "Charlie Brown", "email": "charlie@example.com", "phone": "555-555-5555", "location": "Austin, TX", "website": "https://charlie.data", "summary": "Detail-oriented Data Analyst and Python developer. Strong background in data modeling, NLP, and machine learning pipelines."}, "education": [{"school": "Austin Tech School", "degree": "Certificate in Data Science", "year": "2022"}], "experience": [{"company": "Data Solutions", "role": "Junior Data Analyst", "duration": "2022 - Present", "description": "Analyzed large datasets using Pandas and NumPy. Designed dashboard reports using Python Flask backend APIs."}], "skills": ["Python", "SQL", "Pandas", "spaCy", "Scikit-Learn", "FastAPI", "PowerBI"], "projects": [{"title": "Customer Segments", "description": "Created a clustering model to segment customers using k-means."}]}', 
'classic');

-- 3. Insert Analysis Reports
INSERT INTO analysis_reports (id, resume_id, user_id, ats_score, keywords_found, grammar_issues, suggestions) VALUES
(1, 1, 1, 85, 
'["Node.js", "React", "Python", "SQL", "Docker", "Microservices"]', 
'[]', 
'["Great keyword coverage. Consider adding metrics/quantities to your achievements to strengthen impact.", "Add more details to your projects section."]'
),
(2, 2, 2, 70, 
'["React", "Tailwind CSS", "HTML5", "CSS3", "JavaScript"]', 
'["Found a spelling error in summary: React is occasionally lowercase in similar drafts.", "Consider using more action verbs."]', 
'["Your summary is good, but the technical section lacks backend keywords. Consider adding Node.js or SQL if you have basic familiarity.", "Add certification or training details if any."]'
),
(3, 3, 3, 62, 
'["Python", "SQL", "Pandas", "spaCy"]', 
'[]', 
'["Resume is a bit brief. Try adding more items to your experience details.", "Specify more tools and packages used in machine learning."]'
);

-- 4. Insert Companies (Password is 'password123', hashed with bcrypt)
INSERT INTO companies (id, name, industry, email, password) VALUES
(1, 'Innova Technologies', 'Software & AI Services', 'recruiter1@innova.com', '$2a$10$e0MYz4wQ1Bf/dK2eHlC95.hJ.JpSjQjZ36/jI21tH72eWc4Hn5oWq'),
(2, 'Global Finance Corp', 'Banking & Fintech', 'recruiter2@globalfin.com', '$2a$10$e0MYz4wQ1Bf/dK2eHlC95.hJ.JpSjQjZ36/jI21tH72eWc4Hn5oWq');

-- 5. Insert Shortlisted Resumes
INSERT INTO shortlisted_resumes (id, company_id, resume_id, score, status, notes) VALUES
(1, 1, 1, 85, 'shortlisted', 'Excellent full stack experience and Python skills. Interview scheduled.'),
(2, 1, 2, 70, 'applied', 'Good frontend layout skills, needs vetting on JS performance topics.'),
(3, 2, 3, 62, 'reviewed', 'Python analyst. Resume is a bit light on enterprise SQL skills.');
