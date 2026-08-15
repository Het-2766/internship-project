let currentResumeId = null;

document.addEventListener('DOMContentLoaded', () => {
  // Check auth
  const user = getLoggedInUser();
  const authLink = document.getElementById('authLink');
  if (user) {
    authLink.innerHTML = `
      <span style="margin-right: 1rem; font-weight: 500; font-size: 0.95rem; color: #a5b4fc;">
        Hi, ${user.name}
      </span>
      <button onclick="logout()" class="btn btn-secondary btn-sm" style="display:inline-flex;">Sign Out</button>
    `;
    
    // Load existing resume if any
    loadLatestResume(user.id);
  } else {
    // Encourage sign in
    showNotification('Sign in to save resumes and analyze them with AI!', 'warning');
  }

  // Initial preview render
  updatePreview();
});

// Dynamic form rows
function addExperienceRow() {
  const container = document.getElementById('experienceContainer');
  const div = document.createElement('div');
  div.className = 'glass-panel experience-row';
  div.style = 'padding: 1rem; margin-bottom: 1rem; border-color: rgba(255,255,255,0.05);';
  div.innerHTML = `
    <div class="form-group">
      <label>Company</label>
      <input type="text" class="form-control exp-company" placeholder="e.g. Google" oninput="updatePreview()">
    </div>
    <div class="form-group">
      <label>Role</label>
      <input type="text" class="form-control exp-role" placeholder="e.g. Senior Developer" oninput="updatePreview()">
    </div>
    <div class="form-group">
      <label>Duration</label>
      <input type="text" class="form-control exp-duration" placeholder="e.g. Jan 2021 - Present" oninput="updatePreview()">
    </div>
    <div class="form-group">
      <label>Description / Core Accomplishments</label>
      <textarea class="form-control exp-desc" placeholder="Describe achievements..." oninput="updatePreview()"></textarea>
    </div>
    <button onclick="removeRow(this)" class="btn btn-secondary btn-sm" style="color:var(--color-danger); border-color:rgba(239, 68, 68, 0.2); width:100%;">
      <i class="fa-solid fa-trash"></i> Remove Entry
    </button>
  `;
  container.appendChild(div);
  updatePreview();
}

function addEducationRow() {
  const container = document.getElementById('educationContainer');
  const div = document.createElement('div');
  div.className = 'glass-panel education-row';
  div.style = 'padding: 1rem; margin-bottom: 1rem; border-color: rgba(255,255,255,0.05);';
  div.innerHTML = `
    <div class="form-group">
      <label>School / University</label>
      <input type="text" class="form-control edu-school" placeholder="e.g. MIT" oninput="updatePreview()">
    </div>
    <div class="form-group">
      <label>Degree / Field of Study</label>
      <input type="text" class="form-control edu-degree" placeholder="e.g. Master of Data Analysis" oninput="updatePreview()">
    </div>
    <div class="form-group">
      <label>Graduation Year</label>
      <input type="text" class="form-control edu-year" placeholder="e.g. 2021" oninput="updatePreview()">
    </div>
    <button onclick="removeRow(this)" class="btn btn-secondary btn-sm" style="color:var(--color-danger); border-color:rgba(239, 68, 68, 0.2); width:100%;">
      <i class="fa-solid fa-trash"></i> Remove Entry
    </button>
  `;
  container.appendChild(div);
  updatePreview();
}

function removeRow(btn) {
  btn.parentElement.remove();
  updatePreview();
}

// Assemble JSON data structure from UI inputs
function getResumeData() {
  const name = document.getElementById('fullName').value;
  const email = document.getElementById('email').value;
  const phone = document.getElementById('phone').value;
  const location = document.getElementById('location').value;
  const website = document.getElementById('website').value;
  const summary = document.getElementById('summary').value;
  const skills = document.getElementById('skillsInput').value.split(',').map(s => s.trim()).filter(Boolean);

  // Compile experience array
  const experience = [];
  document.querySelectorAll('.experience-row').forEach(row => {
    const company = row.querySelector('.exp-company').value;
    const role = row.querySelector('.exp-role').value;
    const duration = row.querySelector('.exp-duration').value;
    const description = row.querySelector('.exp-desc').value;
    if (company || role) {
      experience.push({ company, role, duration, description });
    }
  });

  // Compile education array
  const education = [];
  document.querySelectorAll('.education-row').forEach(row => {
    const school = row.querySelector('.edu-school').value;
    const degree = row.querySelector('.edu-degree').value;
    const year = row.querySelector('.edu-year').value;
    if (school || degree) {
      education.push({ school, degree, year });
    }
  });

  return {
    personal_info: { name, email, phone, location, website, summary },
    skills,
    experience,
    education
  };
}

// Render Resume markup dynamically inside the preview pane
function updatePreview() {
  const data = getResumeData();
  const template = document.getElementById('templateSelect').value;
  const preview = document.getElementById('resumePreview');

  let skillsHtml = data.skills.map(s => `<span class="resume-skill-badge">${s}</span>`).join('');

  let experienceHtml = data.experience.map(exp => `
    <div class="resume-entry">
      <div class="resume-entry-header">
        <span>${exp.role || 'Position Title'}</span>
        <span>${exp.duration || 'Dates'}</span>
      </div>
      <div class="resume-entry-sub">
        <span>${exp.company || 'Company Name'}</span>
      </div>
      <p style="font-size: 0.9rem; margin-top:0.25rem; white-space: pre-line;">${exp.description || ''}</p>
    </div>
  `).join('');

  let educationHtml = data.education.map(edu => `
    <div class="resume-entry">
      <div class="resume-entry-header">
        <span>${edu.degree || 'Degree Course'}</span>
        <span>${edu.year || 'Graduation Year'}</span>
      </div>
      <div class="resume-entry-sub">
        <span>${edu.school || 'Institution'}</span>
      </div>
    </div>
  `).join('');

  // Styles based on templates
  if (template === 'classic') {
    preview.style.fontFamily = '"Georgia", serif';
    preview.style.color = '#1f2937';
  } else if (template === 'creative') {
    preview.style.fontFamily = '"Outfit", sans-serif';
    preview.style.color = '#312e81'; // Deep Indigo
  } else {
    preview.style.fontFamily = '"Inter", sans-serif';
    preview.style.color = '#374151';
  }

  // Construct HTML
  preview.innerHTML = `
    <div class="resume-preview-header">
      <h1 style="color: ${template === 'creative' ? 'var(--color-primary)' : '#111827'}">${data.personal_info.name || 'Your Name'}</h1>
      <div class="resume-preview-contacts">
        ${data.personal_info.email ? `<span><i class="fa-solid fa-envelope"></i> ${data.personal_info.email}</span>` : ''}
        ${data.personal_info.phone ? `<span><i class="fa-solid fa-phone"></i> ${data.personal_info.phone}</span>` : ''}
        ${data.personal_info.location ? `<span><i class="fa-solid fa-location-dot"></i> ${data.personal_info.location}</span>` : ''}
        ${data.personal_info.website ? `<span><i class="fa-solid fa-globe"></i> <a href="${data.personal_info.website}" target="_blank" style="color:inherit; text-decoration:none;">${data.personal_info.website.replace(/^https?:\/\//, '')}</a></span>` : ''}
      </div>
    </div>

    ${data.personal_info.summary ? `
      <div>
        <h2 style="border-color: ${template === 'creative' ? 'var(--color-secondary)' : 'var(--color-primary)'}">Professional Summary</h2>
        <p style="font-size:0.95rem;">${data.personal_info.summary}</p>
      </div>
    ` : ''}

    ${data.experience.length > 0 ? `
      <div>
        <h2 style="border-color: ${template === 'creative' ? 'var(--color-secondary)' : 'var(--color-primary)'}">Work History</h2>
        ${experienceHtml}
      </div>
    ` : ''}

    ${data.education.length > 0 ? `
      <div>
        <h2 style="border-color: ${template === 'creative' ? 'var(--color-secondary)' : 'var(--color-primary)'}">Education</h2>
        ${educationHtml}
      </div>
    ` : ''}

    ${data.skills.length > 0 ? `
      <div>
        <h2 style="border-color: ${template === 'creative' ? 'var(--color-secondary)' : 'var(--color-primary)'}">Skills</h2>
        <div class="resume-preview-skills-list">
          ${skillsHtml}
        </div>
      </div>
    ` : ''}
  `;
}

// Convert entire preview page text to a clean single string for analyzer
function getResumeFullText() {
  const data = getResumeData();
  let text = `${data.personal_info.name}\n${data.personal_info.email} | ${data.personal_info.phone} | ${data.personal_info.location}\n`;
  if (data.personal_info.website) text += `${data.personal_info.website}\n`;
  text += `\nSUMMARY\n${data.personal_info.summary}\n`;
  
  text += `\nEXPERIENCE\n`;
  data.experience.forEach(exp => {
    text += `${exp.role} - ${exp.company} (${exp.duration})\n${exp.description}\n`;
  });
  
  text += `\nEDUCATION\n`;
  data.education.forEach(edu => {
    text += `${edu.degree} - ${edu.school} (${edu.year})\n`;
  });

  text += `\nSKILLS\n${data.skills.join(', ')}\n`;
  return text;
}

// Load user's latest saved resume
async function loadLatestResume(userId) {
  try {
    const list = await API.getResumes(userId);
    if (list.length > 0) {
      const details = await API.getResume(list[0].id);
      currentResumeId = details.id;

      // Fill in fields
      document.getElementById('resumeTitle').value = details.title;
      document.getElementById('templateSelect').value = details.template_type;
      
      const content = details.content;
      document.getElementById('fullName').value = content.personal_info.name || '';
      document.getElementById('email').value = content.personal_info.email || '';
      document.getElementById('phone').value = content.personal_info.phone || '';
      document.getElementById('location').value = content.personal_info.location || '';
      document.getElementById('website').value = content.personal_info.website || '';
      document.getElementById('summary').value = content.personal_info.summary || '';
      document.getElementById('skillsInput').value = (content.skills || []).join(', ');

      // Render Experience
      const expContainer = document.getElementById('experienceContainer');
      expContainer.innerHTML = '';
      if (content.experience && content.experience.length > 0) {
        content.experience.forEach(exp => {
          const div = document.createElement('div');
          div.className = 'glass-panel experience-row';
          div.style = 'padding: 1rem; margin-bottom: 1rem; border-color: rgba(255,255,255,0.05);';
          div.innerHTML = `
            <div class="form-group">
              <label>Company</label>
              <input type="text" class="form-control exp-company" value="${exp.company || ''}" oninput="updatePreview()">
            </div>
            <div class="form-group">
              <label>Role</label>
              <input type="text" class="form-control exp-role" value="${exp.role || ''}" oninput="updatePreview()">
            </div>
            <div class="form-group">
              <label>Duration</label>
              <input type="text" class="form-control exp-duration" value="${exp.duration || ''}" oninput="updatePreview()">
            </div>
            <div class="form-group">
              <label>Description / Core Accomplishments</label>
              <textarea class="form-control exp-desc" oninput="updatePreview()">${exp.description || ''}</textarea>
            </div>
            <button onclick="removeRow(this)" class="btn btn-secondary btn-sm" style="color:var(--color-danger); border-color:rgba(239, 68, 68, 0.2); width:100%;">
              <i class="fa-solid fa-trash"></i> Remove Entry
            </button>
          `;
          expContainer.appendChild(div);
        });
      }

      // Render Education
      const eduContainer = document.getElementById('educationContainer');
      eduContainer.innerHTML = '';
      if (content.education && content.education.length > 0) {
        content.education.forEach(edu => {
          const div = document.createElement('div');
          div.className = 'glass-panel education-row';
          div.style = 'padding: 1rem; margin-bottom: 1rem; border-color: rgba(255,255,255,0.05);';
          div.innerHTML = `
            <div class="form-group">
              <label>School / University</label>
              <input type="text" class="form-control edu-school" value="${edu.school || ''}" oninput="updatePreview()">
            </div>
            <div class="form-group">
              <label>Degree / Field of Study</label>
              <input type="text" class="form-control edu-degree" value="${edu.degree || ''}" oninput="updatePreview()">
            </div>
            <div class="form-group">
              <label>Graduation Year</label>
              <input type="text" class="form-control edu-year" value="${edu.year || ''}" oninput="updatePreview()">
            </div>
            <button onclick="removeRow(this)" class="btn btn-secondary btn-sm" style="color:var(--color-danger); border-color:rgba(239, 68, 68, 0.2); width:100%;">
              <i class="fa-solid fa-trash"></i> Remove Entry
            </button>
          `;
          eduContainer.appendChild(div);
        });
      }

      updatePreview();
      showNotification('Loaded latest saved resume!', 'success');
    }
  } catch (err) {
    console.error('Failed to load user resume:', err);
  }
}

// Save resume to DB
async function saveResume() {
  const user = getLoggedInUser();
  if (!user) {
    showNotification('Please Sign In first to save your progress.', 'warning');
    return;
  }

  const title = document.getElementById('resumeTitle').value || 'My Resume';
  const templateType = document.getElementById('templateSelect').value;
  const content = getResumeData();

  try {
    if (currentResumeId) {
      // Update
      await API.updateResume(currentResumeId, title, content, templateType);
      showNotification('Resume updated successfully!', 'success');
    } else {
      // Create
      const response = await API.createResume(user.id, title, content, templateType);
      currentResumeId = response.resumeId;
      showNotification('Resume saved successfully!', 'success');
    }
  } catch (err) {
    showNotification(err.message || 'Error saving resume.', 'danger');
  }
}

// Call Python analyzer on current text
async function sendToAnalyzer() {
  const user = getLoggedInUser();
  if (!user) {
    showNotification('Please Sign In first to run AI Analysis.', 'warning');
    return;
  }

  // Save the resume first
  await saveResume();

  if (!currentResumeId) {
    showNotification('Save the resume before running the analysis.', 'warning');
    return;
  }

  showNotification('Running AI scoring engine, please wait...', 'warning');

  const text = getResumeFullText();

  try {
    const response = await API.analyzeText(currentResumeId, user.id, text);
    // Cache result in localStorage and redirect
    localStorage.setItem('latest_analysis', JSON.stringify(response.analysis));
    window.location.href = 'analyzer.html';
  } catch (err) {
    showNotification(err.message || 'AI engine failed to respond.', 'danger');
  }
}

// Print browser function
function exportPDF() {
  window.print();
}

// Banner feedback helpers
function showNotification(msg, type = 'success') {
  const banner = document.getElementById('notifyBanner');
  banner.textContent = msg;
  banner.style.display = 'block';
  
  if (type === 'success') {
    banner.style.background = 'rgba(16, 185, 129, 0.1)';
    banner.style.color = '#34d399';
    banner.style.border = '1px solid rgba(16, 185, 129, 0.2)';
  } else if (type === 'warning') {
    banner.style.background = 'rgba(245, 158, 11, 0.1)';
    banner.style.color = '#fbbf24';
    banner.style.border = '1px solid rgba(245, 158, 11, 0.2)';
  } else {
    banner.style.background = 'rgba(239, 68, 68, 0.1)';
    banner.style.color = '#f87171';
    banner.style.border = '1px solid rgba(239, 68, 68, 0.2)';
  }

  // Auto fade out
  setTimeout(() => {
    banner.style.display = 'none';
  }, 4000);
}
