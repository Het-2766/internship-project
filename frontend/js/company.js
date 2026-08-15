let selectedResumeId = null;
let selectedCandidateScore = null;
let statusChartInstance = null;
let modalSelectedFile = null;

document.addEventListener('DOMContentLoaded', () => {
  const user = getLoggedInUser();
  const authLink = document.getElementById('authLink');
  
  if (!user || user.role !== 'recruiter') {
    // Force redirect if not recruiter
    alert('Unauthorized: Recruiter access only.');
    window.location.href = 'login.html';
    return;
  }

  authLink.innerHTML = `
    <span style="margin-right: 1rem; font-weight: 500; font-size: 0.95rem; color: #a5b4fc;">
      Hi, ${user.name} (Recruiter)
    </span>
  `;

  document.getElementById('companyGreeting').textContent = `${user.name}'s Recruiter Hub`;

  // Initialize
  loadStats(user.companyId);
  loadCandidatesList();

  // Set up drag & drop for the addCandidateModal
  const modalDropzone = document.getElementById('modalDropzone');
  if (modalDropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      modalDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        modalDropzone.style.borderColor = 'var(--color-primary)';
        modalDropzone.style.background = 'rgba(99, 102, 241, 0.05)';
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      modalDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        modalDropzone.style.borderColor = 'rgba(255,255,255,0.1)';
        modalDropzone.style.background = 'rgba(255,255,255,0.02)';
      }, false);
    });

    modalDropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        modalSelectedFile = files[0];
        // Note: syncing file input via files assignment is permitted in modern browsers
        const fileInput = document.getElementById('addCandidateFile');
        if (fileInput) {
          fileInput.files = files;
        }
        document.getElementById('dropzoneText').textContent = `Selected: ${modalSelectedFile.name}`;
      }
    });
  }
});


// Load stats widgets
async function loadStats(companyId) {
  try {
    const stats = await API.getCompanyStats(companyId);
    
    document.getElementById('statTotalApplicants').textContent = stats.totalApplicants;
    document.getElementById('statAvgScore').textContent = `${stats.averageScore}%`;
    
    // Calculate shortlisted count
    const shortlistedCount = stats.statusDistribution.find(d => d.status === 'shortlisted')?.count || 0;
    document.getElementById('statShortlisted').textContent = shortlistedCount;

    // Render / Update Chart.js
    renderStatusChart(stats.statusDistribution);

  } catch (err) {
    console.error('Failed to load recruitment stats:', err);
  }
}

// Fetch filter states and load candidates table
async function loadCandidatesList() {
  const search = document.getElementById('filterSearch').value;
  const skill = document.getElementById('filterSkill').value;
  const minScore = document.getElementById('filterMinScore').value;

  try {
    const candidates = await API.getCandidates({ search, skill, minScore });
    const tbody = document.getElementById('candidatesTableBody');
    tbody.innerHTML = '';

    if (candidates.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No candidates matching the criteria were found.</td></tr>';
      return;
    }

    candidates.forEach(c => {
      const skillsBadge = c.skills.slice(0, 4).map(s => `<span class="badge" style="font-size:0.75rem; padding:0.1rem 0.4rem;">${s}</span>`).join(' ');
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight:600;">${c.candidate_name}</td>
        <td style="color:var(--text-muted); font-size:0.9rem;">${c.title}</td>
        <td><div style="display:flex; flex-wrap:wrap; gap:0.25rem;">${skillsBadge || 'None'}</div></td>
        <td>
          <span class="candidate-score-badge ${c.ats_score >= 80 ? 'score-high' : c.ats_score >= 65 ? 'score-mid' : 'score-low'}">
            ${c.ats_score ? c.ats_score + '%' : 'N/A'}
          </span>
        </td>
        <td>
          <span class="badge" style="text-transform: capitalize; border-color: rgba(255,255,255,0.15)">
            ${c.profile_strength || 'Unoptimized'}
          </span>
        </td>
        <td>
          <button onclick="openCandidateReview(${c.resume_id}, '${c.candidate_name}', '${c.candidate_email}', ${c.ats_score}, '${c.profile_strength}')" class="btn btn-secondary btn-sm" style="padding:0.25rem 0.5rem; font-size:0.8rem;">
            <i class="fa-solid fa-user-magnifying-glass"></i> Assess
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error listing candidates:', err);
  }
}

// Chart.js render function
function renderStatusChart(dist) {
  const ctx = document.getElementById('statusChart').getContext('2d');
  
  // Standard statuses
  const labels = ['Applied', 'Reviewed', 'Shortlisted', 'Rejected'];
  const counts = [0, 0, 0, 0];

  dist.forEach(d => {
    if (d.status === 'applied') counts[0] = d.count;
    else if (d.status === 'reviewed') counts[1] = d.count;
    else if (d.status === 'shortlisted') counts[2] = d.count;
    else if (d.status === 'rejected') counts[3] = d.count;
  });

  const chartData = {
    labels: labels,
    datasets: [{
      data: counts,
      backgroundColor: [
        '#6366f1', // indigo
        '#f59e0b', // amber
        '#10b981', // emerald
        '#ef4444'  // rose
      ],
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)'
    }]
  };

  if (statusChartInstance) {
    // Update existing chart
    statusChartInstance.data = chartData;
    statusChartInstance.update();
  } else {
    // Create new chart
    statusChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#9ca3af',
              font: { family: 'Inter', size: 11 }
            }
          }
        }
      }
    });
  }
}

// Assess/Shortlist dialog functions
async function openCandidateReview(resumeId, name, email, score, strength) {
  const user = getLoggedInUser();
  selectedResumeId = resumeId;
  selectedCandidateScore = score;

  document.getElementById('modalName').textContent = name;
  document.getElementById('modalEmail').innerHTML = `<i class="fa-solid fa-envelope"></i> ${email}`;
  
  const scoreBadge = document.getElementById('modalScoreBadge');
  scoreBadge.textContent = `${score}%`;
  scoreBadge.className = `candidate-score-badge ${score >= 80 ? 'score-high' : score >= 65 ? 'score-mid' : 'score-low'}`;
  
  document.getElementById('modalProfileStrength').textContent = strength;

  // Clear modal values
  document.getElementById('modalStatus').value = 'applied';
  document.getElementById('modalNotes').value = '';
  document.getElementById('modalResumeBody').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading resume details...';

  document.getElementById('candidateModal').style.display = 'flex';

  try {
    // 1. Fetch resume structure
    const resume = await API.getResume(resumeId);
    const content = resume.content;
    
    // Construct HTML details format
    let summaryText = `<strong>Professional Summary:</strong>\n${content.personal_info.summary || 'None'}\n\n`;
    
    summaryText += `<strong>Skills:</strong>\n${(content.skills || []).join(', ') || 'None'}\n\n`;
    
    summaryText += `<strong>Experience:</strong>\n`;
    if (content.experience && content.experience.length > 0) {
      content.experience.forEach(exp => {
        summaryText += `- ${exp.role} at ${exp.company} (${exp.duration})\n  ${exp.description}\n`;
      });
    } else {
      summaryText += 'None\n';
    }

    summaryText += `\n<strong>Education:</strong>\n`;
    if (content.education && content.education.length > 0) {
      content.education.forEach(edu => {
        summaryText += `- ${edu.degree} at ${edu.school} (${edu.year})\n`;
      });
    } else {
      summaryText += 'None\n';
    }

    document.getElementById('modalResumeBody').innerHTML = summaryText;

    // 2. Fetch company shortlist status if already assessed
    const shortlistedItems = await API.getShortlistedList(user.companyId);
    const matchedAssessment = shortlistedItems.find(item => item.resume_id === resumeId);
    
    if (matchedAssessment) {
      document.getElementById('modalStatus').value = matchedAssessment.status;
      document.getElementById('modalNotes').value = matchedAssessment.notes || '';
    }

  } catch (err) {
    document.getElementById('modalResumeBody').textContent = 'Failed to load resume details from database.';
    console.error('Modal detail fetch failed:', err);
  }
}

function closeModal() {
  document.getElementById('candidateModal').style.display = 'none';
  selectedResumeId = null;
  selectedCandidateScore = null;
}

// Save Recruiter status changes
async function submitStatusUpdate() {
  const user = getLoggedInUser();
  const status = document.getElementById('modalStatus').value;
  const notes = document.getElementById('modalNotes').value;

  if (!selectedResumeId) return;

  try {
    await API.shortlistCandidate(user.companyId, selectedResumeId, selectedCandidateScore, status, notes);
    
    closeModal();
    // Refresh statistics dashboard and candidates tracker table
    loadStats(user.companyId);
    loadCandidatesList();
    
    alert('Candidate tracking status updated successfully!');
  } catch (err) {
    alert(err.message || 'Status save operation failed.');
  }
}

// Add Candidate Modal controls
function openAddCandidateModal() {
  document.getElementById('addCandidateModal').style.display = 'flex';
  document.getElementById('addCandidateForm').reset();
  modalSelectedFile = null;
  document.getElementById('dropzoneText').textContent = 'Click or drag file here to upload';
  document.getElementById('addStatus').style.display = 'none';
}

function closeAddCandidateModal() {
  document.getElementById('addCandidateModal').style.display = 'none';
}

function handleModalFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    modalSelectedFile = files[0];
    document.getElementById('dropzoneText').textContent = `Selected: ${modalSelectedFile.name}`;
  }
}

async function submitAddCandidate(e) {
  e.preventDefault();
  const user = getLoggedInUser();
  const name = document.getElementById('addCandidateName').value;
  const email = document.getElementById('addCandidateEmail').value;
  const fileInput = document.getElementById('addCandidateFile');
  
  if (!modalSelectedFile && fileInput.files.length === 0) {
    alert('Please select or drag a resume file.');
    return;
  }

  const file = modalSelectedFile || fileInput.files[0];
  const statusDiv = document.getElementById('addStatus');
  statusDiv.style.display = 'block';

  try {
    await API.importCandidate(file, user.companyId, name, email);
    alert('Candidate resume successfully analyzed and imported!');
    closeAddCandidateModal();
    // Refresh statistics dashboard and candidates tracker table
    loadStats(user.companyId);
    loadCandidatesList();
  } catch (err) {
    alert(err.message || 'Failed to import candidate resume.');
  } finally {
    statusDiv.style.display = 'none';
  }
}

