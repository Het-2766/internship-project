const API_BASE = window.location.origin.startsWith('file://') 
  ? 'http://localhost:3000/api' 
  : '/api';


// Auth State Helpers
function getAuthToken() {
  return localStorage.getItem('token');
}

function getLoggedInUser() {
  const userStr = localStorage.getItem('user');
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

function setAuthSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

// Global Custom Fetch Wrapper
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  
  const headers = options.headers || {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Check if we are sending json vs FormData
  if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
    options.body = JSON.stringify(options.body);
    headers['Content-Type'] = 'application/json';
  }

  const mergedOptions = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, mergedOptions);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong with the API call.');
    }
    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error.message);
    throw error;
  }
}

// Endpoint calls
const API = {
  // Auth
  register: (name, email, password, role, industry) => 
    apiRequest('/auth/register', {
      method: 'POST',
      body: { name, email, password, role, industry }
    }),
  
  login: (email, password) => 
    apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password }
    }),

  // Resumes CRUD
  createResume: (userId, title, content, templateType) => 
    apiRequest('/resumes', {
      method: 'POST',
      body: { user_id: userId, title, content, template_type: templateType }
    }),

  getResumes: (userId) => 
    apiRequest(`/resumes/user/${userId}`),

  getResume: (resumeId) => 
    apiRequest(`/resumes/${resumeId}`),

  updateResume: (resumeId, title, content, templateType) => 
    apiRequest(`/resumes/${resumeId}`, {
      method: 'PUT',
      body: { title, content, template_type: templateType }
    }),

  deleteResume: (resumeId) => 
    apiRequest(`/resumes/${resumeId}`, {
      method: 'DELETE'
    }),

  // AI NLP Analyzer
  analyzeText: (resumeId, userId, text) => 
    apiRequest('/analyze/text', {
      method: 'POST',
      body: { resume_id: resumeId, user_id: userId, text }
    }),

  analyzeFile: async (file, userId, name) => {
    const formData = new FormData();
    formData.append('file', file);
    if (userId) formData.append('user_id', userId);
    if (name) formData.append('name', name);

    // Call custom fetch wrapper since FormData handles its own boundary headers
    const response = await fetch(`${API_BASE}/analyze/file`, {
      method: 'POST',
      headers: getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {},
      body: formData
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'File analysis failed.');
    }
    return data;
  },

  getAnalysisHistory: (userId) => 
    apiRequest(`/analyze/history/${userId}`),

  // Recruiter Company Calls
  getCandidates: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.skill) params.append('skill', filters.skill);
    if (filters.minScore) params.append('minScore', filters.minScore);
    if (filters.search) params.append('search', filters.search);
    
    return apiRequest(`/company/candidates?${params.toString()}`);
  },

  shortlistCandidate: (companyId, resumeId, score, status, notes) => 
    apiRequest('/company/shortlist', {
      method: 'POST',
      body: { company_id: companyId, resume_id: resumeId, score, status, notes }
    }),

  getShortlistedList: (companyId) => 
    apiRequest(`/company/shortlisted/${companyId}`),

  getCompanyStats: (companyId) => 
    apiRequest(`/company/stats/${companyId}`),

  importCandidate: async (file, companyId, name, email) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('company_id', companyId);
    if (name) formData.append('name', name);
    if (email) formData.append('email', email);

    const response = await fetch(`${API_BASE}/company/add-candidate`, {
      method: 'POST',
      headers: getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {},
      body: formData
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Importing candidate failed.');
    }
    return data;
  }
};

