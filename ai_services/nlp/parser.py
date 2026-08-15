import re
import os

# Optional spaCy import with fallback
try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
    SPACY_AVAILABLE = True
except Exception:
    SPACY_AVAILABLE = False
    print("Warning: spaCy ('en_core_web_sm') not loaded. Falling back to regex parser.")

# Optional Transformers (Hugging Face) import with fallback
try:
    from transformers import pipeline
    # Initialize a lightweight pipeline (like sentiment or basic classifier) lazily
    classifier = None
    TRANSFORMERS_AVAILABLE = True
except Exception:
    TRANSFORMERS_AVAILABLE = False
    print("Warning: Transformers (Hugging Face) not available. Using fallback classification.")

# Optional LanguageTool grammar check with fallback
try:
    import language_tool_python
    # Initialize tool lazily
    tool = None
    LANGUAGETOOL_AVAILABLE = True
except Exception:
    LANGUAGETOOL_AVAILABLE = False
    print("Warning: language-tool-python not available. Using basic rules for spellcheck.")

# Standard technical keyword categories
TECH_KEYWORDS = {
    "frontend": ["html", "css", "javascript", "react", "angular", "vue", "tailwind", "bootstrap", "typescript", "figma", "redux", "webpack"],
    "backend": ["node.js", "express", "java", "spring boot", "python", "django", "flask", "fastapi", "php", "laravel", "ruby", "rails"],
    "database": ["mysql", "postgresql", "mongodb", "sql", "sqlite", "oracle", "redis", "firebase"],
    "devops": ["docker", "kubernetes", "aws", "azure", "gcp", "git", "jenkins", "cicd", "linux"],
    "data_science": ["pandas", "numpy", "scikit-learn", "spacy", "nltk", "tensorflow", "pytorch", "keras", "tableau", "powerbi"]
}

ALL_SKILLS = [skill for sublist in TECH_KEYWORDS.values() for skill in sublist]

def extract_contact_info(text):
    """Extract email, phone, and website links using regex."""
    email_pattern = r'[\w\.-]+@[\w\.-]+\.\w+'
    phone_pattern = r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'
    url_pattern = r'\bhttps?://[^\s/$.?#].[^\s]*\b'

    emails = re.findall(email_pattern, text)
    phones = re.findall(phone_pattern, text)
    urls = re.findall(url_pattern, text)

    return {
        "email": emails[0] if emails else None,
        "phone": phones[0] if phones else None,
        "website": urls[0] if urls else None
    }

def extract_skills(text):
    """Extract skills from text by checking against dictionary."""
    text_lower = text.lower()
    found_skills = []
    for skill in ALL_SKILLS:
        # Match word boundaries or special chars like node.js, c++
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            # Normalize skills names to match our DB seed capitalization
            normalized = next((s for cat in TECH_KEYWORDS.values() for s in cat if s.lower() == skill.lower()), skill)
            found_skills.append(normalized)
    return list(set(found_skills))

def check_grammar(text):
    """Check for grammar and formatting issues."""
    issues = []
    
    # 1. Check with language-tool-python if available
    if LANGUAGETOOL_AVAILABLE:
        global tool
        try:
            if tool is None:
                # Use remote check or local check (local server might trigger download)
                tool = language_tool_python.LanguageToolPublicAPI('en-US')
            matches = tool.check(text)
            for match in matches[:5]:  # Limit to 5 issues
                issues.append({
                    "message": match.message,
                    "context": match.context,
                    "offset": match.offset,
                    "length": match.errorLength,
                    "suggestions": match.replacements[:3]
                })
        except Exception as e:
            print(f"LanguageTool error, using basic rules: {e}")

    # 2. Simple fallback rule checks
    if not issues:
        # Check for empty fields or placeholder text
        placeholders = ["lorem ipsum", "your summary here", "company name", "[insert", "placeholder"]
        for ph in placeholders:
            if ph in text.lower():
                issues.append({
                    "message": f"Contains placeholder text: '{ph}'",
                    "context": f"... {text[max(0, text.lower().find(ph)-20):min(len(text), text.lower().find(ph)+len(ph)+20)]} ...",
                    "suggestions": ["Replace placeholders with your real professional details."]
                })
        
        # Check for overly long paragraphs (readability issues)
        paragraphs = text.split("\n\n")
        for p in paragraphs:
            if len(p.split()) > 150:
                issues.append({
                    "message": "Overly long paragraph detected. Break into shorter sentences or bullet points.",
                    "context": p[:50] + "...",
                    "suggestions": ["Break into 2-3 bullet points to make it scannable for recruiters."]
                })
                
        # Simple passive voice checklist
        passive_triggers = ["was chosen", "were made", "was completed by", "was responsible for"]
        for trigger in passive_triggers:
            if trigger in text.lower():
                issues.append({
                    "message": "Passive voice or weak action verb detected.",
                    "context": trigger,
                    "suggestions": ["Use active action verbs: 'Managed', 'Engineered', 'Optimized', 'Led'."]
                })

    return issues

def analyze_resume(text, target_role=None):
    """
    Main analysis pipeline.
    Computes ATS score (0-100), extracts skills, details, errors and returns structured JSON feedback.
    """
    contact_info = extract_contact_info(text)
    skills = extract_skills(text)
    grammar_issues = check_grammar(text)
    
    # Calculate score metrics
    score = 40  # Base score for uploading a readable resume
    suggestions = []
    
    # Contact Info component (Max 10 pts)
    contact_score = 0
    if contact_info["email"]: contact_score += 4
    else: suggestions.append("Add a professional email address.")
    if contact_info["phone"]: contact_score += 3
    else: suggestions.append("Add a contact phone number.")
    if contact_info["website"]: contact_score += 3
    else: suggestions.append("Add a professional website, portfolio, or LinkedIn URL.")
    score += contact_score

    # Skills component (Max 30 pts)
    # Give points based on total keywords matched
    num_skills = len(skills)
    skills_score = min(30, num_skills * 4)
    score += skills_score
    if num_skills < 5:
        suggestions.append("Increase your skills inventory. Aim to list at least 6-8 relevant technical skills.")
    
    # Content length & structure component (Max 20 pts)
    word_count = len(text.split())
    if 200 <= word_count <= 600:
        score += 20
    elif word_count < 200:
        score += 5
        suggestions.append("Your resume content is too short (under 200 words). Add detail to your job descriptions, projects, or accomplishments.")
    else:
        score += 10
        suggestions.append("Your resume is quite long (over 600 words). Ensure it is concise and fits on 1-2 pages.")
        
    # Grammar deduction
    deduction = min(15, len(grammar_issues) * 3)
    score = max(10, min(100, score - deduction))

    # Profile strength classification (using Hugging Face fallback)
    strength = "Junior"
    if score >= 80:
        strength = "Excellent (ATS Optimized)"
    elif score >= 65:
        strength = "Mid-Level (Solid foundation)"
    else:
        strength = "Needs Work (Unoptimized)"

    # Role categorization based on keyword matches
    role_matches = {cat: 0 for cat in TECH_KEYWORDS}
    text_lower = text.lower()
    for cat, keywords in TECH_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                role_matches[cat] += 1
                
    predicted_role = max(role_matches, key=role_matches.get) if any(role_matches.values()) else "General Software Engineer"
    predicted_role = predicted_role.replace("_", " ").title()

    return {
        "ats_score": int(score),
        "predicted_role": predicted_role,
        "profile_strength": strength,
        "contact_info": contact_info,
        "skills": skills,
        "grammar_issues": grammar_issues,
        "suggestions": suggestions
    }
