/**
 * API Client for Cloud Web App
 * Handles all API communication with backend
 */

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export interface User {
  id: string;
  email: string;
  name?: string;
  plan?: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  template?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface File {
  id: string;
  path: string;
  content: string;
  language?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  projectId: string;
  createdAt: string;
}

export class APIClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    // O client-side deve falar somente com as rotas Next (/api/*),
    // para garantir auth/entitlements/metering no server.
    this.baseURL = '/api';
    
    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('aethel-token');
    }
  }

  /**
   * Set authentication token
   */
  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('aethel-token', token);
    }
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Clear authentication token
   */
  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('aethel-token');
    }
  }

  /**
   * Make authenticated request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new APIError(
          error.message || `HTTP ${response.status}`,
          response.status,
          error
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }
  }

  // ============================================
  // AUTH METHODS
  // ============================================

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.setToken(response.access_token);
    return response;
  }

  /**
   * Register new user
   */
  async register(
    email: string,
    password: string,
    name?: string
  ): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });

    this.setToken(response.access_token);
    return response;
  }

  /**
   * Logout current user
   */
  logout() {
    this.clearToken();
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    return this.request<User>('/auth/profile');
  }

  // ============================================
  // PROJECT METHODS
  // ============================================

  /**
   * Get all projects for current user
   */
  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>('/projects');
  }

  /**
   * Get single project by ID
   */
  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`);
  }

  /**
   * Create new project
   */
  async createProject(data: {
    name: string;
    template?: string;
  }): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update project
   */
  async updateProject(
    id: string,
    data: Partial<Project>
  ): Promise<Project> {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete project
   */
  async deleteProject(id: string): Promise<void> {
    await this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // FILE METHODS
  // ============================================

  /**
   * Get all files for a project
   */
  async getFiles(projectId: string): Promise<File[]> {
    return this.request<File[]>(`/files?projectId=${projectId}`);
  }

  /**
   * Get single file
   */
  async getFile(id: string): Promise<File> {
    return this.request<File>(`/files/${id}`);
  }

  /**
   * Create or update file
   */
  async saveFile(data: {
    projectId: string;
    path: string;
    content: string;
    language?: string;
  }): Promise<File> {
    return this.request<File>('/files', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete file
   */
  async deleteFile(id: string): Promise<void> {
    await this.request(`/files/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get file structure for project
   */
  async getFileStructure(projectId: string): Promise<any> {
    return this.request(`/files/structure?projectId=${projectId}`);
  }

  // ============================================
  // ASSET METHODS
  // ============================================

  /**
   * Get all assets for a project
   */
  async getAssets(projectId: string): Promise<Asset[]> {
    return this.request<Asset[]>(`/assets?projectId=${projectId}`);
  }

  /**
   * Upload asset
   */
  async uploadAsset(
    projectId: string,
    file: File
  ): Promise<Asset> {
    const formData = new FormData();
    formData.append('file', file as unknown as Blob, (file as any)?.name ?? 'upload.bin');
    formData.append('projectId', projectId);

    const url = `${this.baseURL}/assets/upload`;
    const headers: HeadersInit = {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new APIError(`Upload failed: ${response.status}`, response.status);
    }

    return await response.json();
  }

  /**
   * Delete asset
   */
  async deleteAsset(id: string): Promise<void> {
    await this.request(`/assets/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // BILLING METHODS
  // ============================================

  /**
   * Get billing plans
   */
  async getBillingPlans(): Promise<any[]> {
    return this.request('/billing/plans');
  }

  /**
   * Create checkout session
   */
  async createCheckoutSession(planId: string): Promise<{ sessionId: string }> {
    return this.request('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    });
  }

  /**
   * Get user subscription
   */
  async getSubscription(): Promise<any> {
    return this.request('/billing/subscription');
  }

  // ============================================
  // ADMIN METHODS
  // ============================================

  /**
   * Get all users (admin only)
   */
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/admin/users');
  }

  /**
   * Get analytics (admin only)
   */
  async getAnalytics(): Promise<any> {
    return this.request('/admin/analytics');
  }
}

// Create singleton instance
export const apiClient = new APIClient();

// Export for use in components
export default apiClient;
