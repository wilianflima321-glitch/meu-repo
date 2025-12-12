import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Projects
export const createProject = (data) => api.post('/projects', data);
export const getProjects = () => api.get('/projects');
export const getProject = (id) => api.get(`/projects/${id}`);
export const deleteProject = (id) => api.delete(`/projects/${id}`);

// Files
export const createFile = (projectId, data) => api.post(`/projects/${projectId}/files`, data);
export const getFiles = (projectId) => api.get(`/projects/${projectId}/files`);
export const getFileTree = (projectId) => api.get(`/projects/${projectId}/file-tree`);
export const getFile = (fileId) => api.get(`/files/${fileId}`);
export const updateFile = (fileId, data) => api.put(`/files/${fileId}`, data);
export const deleteFile = (fileId) => api.delete(`/files/${fileId}`);

// Terminal
export const executeCommand = (projectId, data) => api.post(`/projects/${projectId}/terminal/execute`, data);

// AI Assistant
export const queryAI = (data) => api.post('/ai/query', data);
export const getConversation = (id) => api.get(`/ai/conversations/${id}`);

// Animations
export const createAnimation = (projectId, data) => api.post(`/projects/${projectId}/animations`, data);
export const getAnimations = (projectId) => api.get(`/projects/${projectId}/animations`);
export const getAnimation = (id) => api.get(`/animations/${id}`);
export const addAnimationTrack = (animationId, name, property, color) => 
  api.post(`/animations/${animationId}/tracks?name=${name}&property=${property}&color=${encodeURIComponent(color)}`);
export const addKeyframe = (animationId, data) => api.post(`/animations/${animationId}/keyframes`, data);
export const deleteAnimation = (id) => api.delete(`/animations/${id}`);

// Profiling
export const startProfiling = (projectId, data) => api.post(`/projects/${projectId}/profiling/start`, data);
export const addProfileSample = (sessionId, data) => api.post(`/profiling/${sessionId}/sample`, data);
export const stopProfiling = (sessionId) => api.post(`/profiling/${sessionId}/stop`);
export const getProfilingSessions = (projectId) => api.get(`/projects/${projectId}/profiling/sessions`);
export const getProfilingSession = (id) => api.get(`/profiling/${id}`);

// Git
export const getGitStatus = (projectId) => api.get(`/projects/${projectId}/git/status`);
export const gitCommit = (projectId, data) => api.post(`/projects/${projectId}/git/commit`, data);
export const createBranch = (projectId, data) => api.post(`/projects/${projectId}/git/branch`, data);
export const getBranches = (projectId) => api.get(`/projects/${projectId}/git/branches`);
export const getCommits = (projectId, limit = 20) => api.get(`/projects/${projectId}/git/commits?limit=${limit}`);

// Search
export const searchFiles = (projectId, data) => api.post(`/projects/${projectId}/search`, data);

// Extensions
export const getExtensions = () => api.get('/extensions');
export const toggleExtension = (id) => api.put(`/extensions/${id}/toggle`);

// Themes
export const getThemes = () => api.get('/themes');

// Settings
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);

// Snippets
export const getSnippets = () => api.get('/snippets');
export const createSnippet = (data) => api.post('/snippets', data);

// Debug
export const startDebugSession = (projectId) => api.post(`/projects/${projectId}/debug/start`);
export const addBreakpoint = (sessionId, data) => api.post(`/debug/${sessionId}/breakpoint`, data);
export const debugStep = (sessionId, action) => api.post(`/debug/${sessionId}/step?action=${action}`);
export const stopDebugSession = (sessionId) => api.post(`/debug/${sessionId}/stop`);
export const getDebugSession = (id) => api.get(`/debug/${id}`);

// Health
export const healthCheck = () => api.get('/health');

export default api;
