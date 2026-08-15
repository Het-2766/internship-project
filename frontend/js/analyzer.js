document.addEventListener('DOMContentLoaded', () => {
  const user = getLoggedInUser();
  const authLink = document.getElementById('authLink');
  
  if (user) {
    authLink.innerHTML = `
      <span style="margin-right: 1rem; font-weight: 500; font-size: 0.95rem; color: #a5b4fc;">
        Hi, ${user.name}
      </span>
      <button onclick="logout()" class="btn btn-secondary btn-sm" style="display:inline-flex;">Sign Out</button>
    `;
    
    // Load history
    loadHistory(user.id);
  } else {
    const notice = document.getElementById('authNotice');
    if (notice) {
      notice.style.display = 'block';
    }
  }


  // Set up Drag and Drop events
  const dropzone = document.getElementById('dropzone');
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('active');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('active');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  });

  // Check if we have a redirect analysis cached from the builder page
  const cachedAnalysis = localStorage.getItem('latest_analysis');
  if (cachedAnalysis) {
    try {
      const parsed = JSON.parse(cachedAnalysis);
      renderAnalysis(parsed);
      localStorage.removeItem('latest_analysis'); // Clean up cache
    } catch (e) {
      console.error('Failed to parse cached analysis:', e);
    }
  }
});

// Select file button helper
function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    uploadFile(files[0]);
  }
}

// Upload file to Node API
async function uploadFile(file) {
  const user = getLoggedInUser();
  const status = document.getElementById('uploadStatus');
  status.style.display = 'block';

  try {
    const userId = user ? user.id : null;
    const userName = user ? user.name : "Guest User";
    
    const response = await API.analyzeFile(file, userId, userName);
    renderAnalysis(response.analysis);
    
    if (user) {
      loadHistory(user.id); // Refresh history
    }
  } catch (err) {
    alert(err.message || 'File analysis failed.');
  } finally {
    status.style.display = 'none';
  }
}

// Circular progress gauge controller
function setGaugeScore(score) {
  const fill = document.getElementById('gaugeFill');
  const text = document.getElementById('scoreText');
  
  // Total circumference of circle r=80 is 2 * PI * 80 = ~502
  const circumference = 502;
  const offset = circumference - (score / 100) * circumference;
  
  fill.style.strokeDashoffset = offset;
  text.textContent = score;

  // Add colors dynamically to gauge text
  if (score >= 85) {
    text.style.color = 'var(--color-success)';
  } else if (score >= 65) {
    text.style.color = 'var(--color-warning)';
  } else {
    text.style.color = 'var(--color-danger)';
  }
}

// Populate UI sections with parsed NLP results
function renderAnalysis(analysis) {
  document.getElementById('analysisResultPanel').style.display = 'grid';

  // 1. Set Score dials
  setGaugeScore(analysis.ats_score);
  
  document.getElementById('strengthText').textContent = analysis.profile_strength || 'Mid-Level';
  document.getElementById('roleText').textContent = `Target Role: ${analysis.predicted_role || 'General Developer'}`;

  // 2. Render contact checklist
  const contactBox = document.getElementById('contactChecklist');
  contactBox.innerHTML = `
    <div class="checklist-item ${analysis.contact_info.email ? 'success' : 'danger'}">
      <i class="fa-solid ${analysis.contact_info.email ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
      <span>Email Address: ${analysis.contact_info.email || 'Missing'}</span>
    </div>
    <div class="checklist-item ${analysis.contact_info.phone ? 'success' : 'danger'}">
      <i class="fa-solid ${analysis.contact_info.phone ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
      <span>Phone Number: ${analysis.contact_info.phone || 'Missing'}</span>
    </div>
    <div class="checklist-item ${analysis.contact_info.website ? 'success' : 'danger'}">
      <i class="fa-solid ${analysis.contact_info.website ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
      <span>Portfolio Link: ${analysis.contact_info.website || 'Missing'}</span>
    </div>
  `;

  // 3. Render skills tags
  const skillsBox = document.getElementById('extractedSkills');
  skillsBox.innerHTML = '';
  if (analysis.skills && analysis.skills.length > 0) {
    analysis.skills.forEach(skill => {
      const span = document.createElement('span');
      span.className = 'badge badge-primary';
      span.innerHTML = `<i class="fa-solid fa-code"></i> ${skill}`;
      skillsBox.appendChild(span);
    });
  } else {
    skillsBox.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No keywords detected.</p>';
  }

  // 4. Render recommendations
  const sugBox = document.getElementById('suggestionsList');
  sugBox.innerHTML = '';
  if (analysis.suggestions && analysis.suggestions.length > 0) {
    analysis.suggestions.forEach(sug => {
      const div = document.createElement('div');
      div.className = 'checklist-item warning';
      div.innerHTML = `
        <i class="fa-solid fa-circle-exclamation"></i>
        <span>${sug}</span>
      `;
      sugBox.appendChild(div);
    });
  } else {
    sugBox.innerHTML = `
      <div class="checklist-item success">
        <i class="fa-solid fa-circle-check"></i>
        <span>Excellent! Your resume layout is already optimized for ATS tracking systems.</span>
      </div>
    `;
  }

  // 5. Render Grammar issues
  const gramBox = document.getElementById('grammarList');
  gramBox.innerHTML = '';
  if (analysis.grammar_issues && analysis.grammar_issues.length > 0) {
    analysis.grammar_issues.forEach(issue => {
      const div = document.createElement('div');
      div.className = 'checklist-item danger';
      div.style = 'flex-direction:column; gap:0.25rem; margin-bottom:1.5rem;';
      div.innerHTML = `
        <div style="display:flex; gap:0.5rem; align-items:center;">
          <i class="fa-solid fa-triangle-exclamation" style="margin-top:0;"></i>
          <span style="font-weight:600;">${issue.message}</span>
        </div>
        <p style="font-size:0.85rem; font-style:italic; color:var(--text-muted); margin-left:1.5rem;">
          Context: "${issue.context}"
        </p>
        ${issue.suggestions && issue.suggestions.length > 0 ? `
          <p style="font-size:0.85rem; color:#f87171; margin-left:1.5rem;">
            Try replacing with: <strong>${issue.suggestions.join(', ')}</strong>
          </p>
        ` : ''}
      `;
      gramBox.appendChild(div);
    });
  } else {
    gramBox.innerHTML = `
      <div class="checklist-item success">
        <i class="fa-solid fa-circle-check"></i>
        <span>No critical spelling, passive-voice, or formatting issues found.</span>
      </div>
    `;
  }

  // Smooth scroll down to results panel
  document.getElementById('analysisResultPanel').scrollIntoView({ behavior: 'smooth' });
}

// Fetch user history from DB and fill history table
async function loadHistory(userId) {
  try {
    const list = await API.getAnalysisHistory(userId);
    const container = document.getElementById('historyPanel');
    const tbody = document.getElementById('historyTableBody');
    
    if (list.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    tbody.innerHTML = '';

    list.forEach(report => {
      const date = new Date(report.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${date}</td>
        <td style="font-weight:500;">${report.resume_title || 'Unnamed Resume'}</td>
        <td>${report.predicted_role || 'General Engineer'}</td>
        <td>
          <span class="candidate-score-badge ${report.ats_score >= 80 ? 'score-high' : report.ats_score >= 65 ? 'score-mid' : 'score-low'}">
            ${report.ats_score}
          </span>
        </td>
        <td>${report.ats_score >= 80 ? 'Excellent' : report.ats_score >= 65 ? 'Mid-Level' : 'Needs Work'}</td>
        <td>
          <button onclick='loadHistoricalReport(${JSON.stringify(report)})' class="btn btn-secondary btn-sm" style="padding:0.25rem 0.5rem; font-size:0.8rem;">
            <i class="fa-solid fa-eye"></i> View Report
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error rendering history:', err);
  }
}

// Load clicked historical report directly in UI
function loadHistoricalReport(report) {
  const analysis = {
    ats_score: report.ats_score,
    predicted_role: report.predicted_role || "General Developer",
    profile_strength: report.ats_score >= 80 ? 'Excellent' : report.ats_score >= 65 ? 'Mid-Level' : 'Needs Work',
    contact_info: {
      email: report.candidate_email || "Extracted in file",
      phone: "Scanned",
      website: "Scanned"
    },
    skills: report.keywords_found,
    grammar_issues: report.grammar_issues,
    suggestions: report.suggestions
  };
  
  renderAnalysis(analysis);
}
