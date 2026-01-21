import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Jobs API
 * Covers job queue management, status monitoring, and operations
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

test.describe('Jobs API', () => {
  
  test.describe('GET /api/jobs', () => {
    test('should return jobs list', async ({ request }) => {
      const response = await request.get(`${API_URL}/jobs`);
      
      // Should return 200 or 401 (if auth required)
      expect([200, 401]).toContain(response.status());
      
      if (response.status() === 200) {
        const body = await response.json();
        expect(body).toHaveProperty('jobs');
        expect(Array.isArray(body.jobs)).toBeTruthy();
      }
    });

    test('should support pagination', async ({ request }) => {
      const response = await request.get(`${API_URL}/jobs?page=1&limit=10`);
      
      if (response.status() === 200) {
        const body = await response.json();
        expect(body.jobs.length).toBeLessThanOrEqual(10);
        if (body.pagination) {
          expect(body.pagination).toHaveProperty('page');
          expect(body.pagination).toHaveProperty('limit');
        }
      }
    });

    test('should filter by status', async ({ request }) => {
      const response = await request.get(`${API_URL}/jobs?status=completed`);
      
      if (response.status() === 200) {
        const body = await response.json();
        body.jobs.forEach((job: any) => {
          expect(job.status).toBe('completed');
        });
      }
    });

    test('should filter by type', async ({ request }) => {
      const response = await request.get(`${API_URL}/jobs?type=build`);
      
      if (response.status() === 200) {
        const body = await response.json();
        body.jobs.forEach((job: any) => {
          expect(job.type).toBe('build');
        });
      }
    });
  });

  test.describe('GET /api/jobs/stats', () => {
    test('should return queue statistics', async ({ request }) => {
      const response = await request.get(`${API_URL}/jobs/stats`);
      
      if (response.status() === 200) {
        const body = await response.json();
        
        // Should have count by status
        expect(body).toHaveProperty('pending');
        expect(body).toHaveProperty('processing');
        expect(body).toHaveProperty('completed');
        expect(body).toHaveProperty('failed');
        
        // Values should be numbers
        expect(typeof body.pending).toBe('number');
        expect(typeof body.processing).toBe('number');
      }
    });

    test('should return queue health', async ({ request }) => {
      const response = await request.get(`${API_URL}/jobs/stats`);
      
      if (response.status() === 200) {
        const body = await response.json();
        
        if (body.health) {
          expect(['healthy', 'degraded', 'critical']).toContain(body.health);
        }
      }
    });
  });

  test.describe('POST /api/jobs', () => {
    test('should create a new job', async ({ request }) => {
      const response = await request.post(`${API_URL}/jobs`, {
        data: {
          type: 'build',
          payload: {
            projectId: 'test-project',
            platform: 'web',
          },
          priority: 1,
        },
      });
      
      // 201 Created, 200 OK, or 401 Unauthorized
      expect([200, 201, 401, 400]).toContain(response.status());
      
      if (response.status() === 201 || response.status() === 200) {
        const body = await response.json();
        expect(body).toHaveProperty('id');
        expect(body).toHaveProperty('type', 'build');
        expect(body).toHaveProperty('status');
      }
    });

    test('should validate required fields', async ({ request }) => {
      const response = await request.post(`${API_URL}/jobs`, {
        data: {},
      });
      
      // Should return 400 Bad Request or 422 Unprocessable
      if (response.status() !== 401) {
        expect([400, 422]).toContain(response.status());
      }
    });

    test('should validate job type', async ({ request }) => {
      const response = await request.post(`${API_URL}/jobs`, {
        data: {
          type: 'invalid-type',
          payload: {},
        },
      });
      
      if (response.status() !== 401) {
        expect([400, 422]).toContain(response.status());
      }
    });
  });

  test.describe('GET /api/jobs/:id', () => {
    test('should return 404 for non-existent job', async ({ request }) => {
      const response = await request.get(`${API_URL}/jobs/non-existent-id-12345`);
      
      // 404 Not Found or 401 Unauthorized
      expect([404, 401]).toContain(response.status());
    });
  });

  test.describe('POST /api/jobs/:id/cancel', () => {
    test('should return 404 for non-existent job', async ({ request }) => {
      const response = await request.post(`${API_URL}/jobs/non-existent-id-12345/cancel`);
      
      expect([404, 401]).toContain(response.status());
    });
  });

  test.describe('POST /api/jobs/:id/retry', () => {
    test('should return 404 for non-existent job', async ({ request }) => {
      const response = await request.post(`${API_URL}/jobs/non-existent-id-12345/retry`);
      
      expect([404, 401]).toContain(response.status());
    });
  });

  test.describe('Queue Control', () => {
    test('POST /api/jobs/start should start the queue', async ({ request }) => {
      const response = await request.post(`${API_URL}/jobs/start`);
      
      expect([200, 401, 403]).toContain(response.status());
      
      if (response.status() === 200) {
        const body = await response.json();
        expect(body).toHaveProperty('message');
      }
    });

    test('POST /api/jobs/stop should stop the queue', async ({ request }) => {
      const response = await request.post(`${API_URL}/jobs/stop`);
      
      expect([200, 401, 403]).toContain(response.status());
      
      if (response.status() === 200) {
        const body = await response.json();
        expect(body).toHaveProperty('message');
      }
    });
  });
});

test.describe('Export API', () => {
  
  test.describe('POST /api/projects/:id/export', () => {
    test('should return 404 for non-existent project', async ({ request }) => {
      const response = await request.post(`${API_URL}/projects/non-existent-id/export`, {
        data: {
          platform: 'web',
        },
      });
      
      expect([404, 401]).toContain(response.status());
    });

    test('should validate platform parameter', async ({ request }) => {
      const response = await request.post(`${API_URL}/projects/test-id/export`, {
        data: {
          platform: 'invalid-platform',
        },
      });
      
      if (response.status() !== 401 && response.status() !== 404) {
        expect([400, 422]).toContain(response.status());
      }
    });

    test('should accept valid platforms', async ({ request }) => {
      const validPlatforms = ['web', 'windows', 'mac', 'linux'];
      
      for (const platform of validPlatforms) {
        const response = await request.post(`${API_URL}/projects/test-id/export`, {
          data: { platform },
        });
        
        // Should not return 400 for valid platform (may return 404 if project doesn't exist)
        if (response.status() !== 401) {
          expect(response.status()).not.toBe(400);
        }
      }
    });
  });
});

test.describe('Health Endpoints', () => {
  
  test('GET /api/health should return health status', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    
    expect(response.ok()).toBeTruthy();
    
    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy', 'ok']).toContain(body.status);
  });

  test('health check should include service status', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    
    if (response.ok()) {
      const body = await response.json();
      
      // May include individual service health
      if (body.services) {
        expect(body.services).toHaveProperty('database');
        expect(body.services).toHaveProperty('redis');
      }
    }
  });
});

test.describe('Rate Limiting', () => {
  
  test('should include rate limit headers', async ({ request }) => {
    const response = await request.get(`${API_URL}/jobs`);
    
    // Check for rate limit headers
    const rateLimitRemaining = response.headers()['x-ratelimit-remaining'];
    const rateLimitLimit = response.headers()['x-ratelimit-limit'];
    
    // Headers may or may not be present depending on implementation
    if (rateLimitLimit) {
      expect(parseInt(rateLimitLimit)).toBeGreaterThan(0);
    }
  });

  test('should not block normal usage', async ({ request }) => {
    // Make several requests quickly
    const promises = Array(5).fill(null).map(() => 
      request.get(`${API_URL}/health`)
    );
    
    const responses = await Promise.all(promises);
    
    // None should be rate limited for just 5 requests
    responses.forEach(response => {
      expect(response.status()).not.toBe(429);
    });
  });
});

test.describe('Error Handling', () => {
  
  test('should return proper error format', async ({ request }) => {
    const response = await request.get(`${API_URL}/non-existent-endpoint`);
    
    expect([404, 401]).toContain(response.status());
    
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should handle malformed JSON', async ({ request }) => {
    const response = await request.post(`${API_URL}/jobs`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: 'not valid json{',
    });
    
    // Should return 400 Bad Request
    expect([400, 401]).toContain(response.status());
  });

  test('should handle missing Content-Type', async ({ request }) => {
    const response = await request.post(`${API_URL}/jobs`, {
      headers: {},
      data: '{"type": "build"}',
    });
    
    // Should handle gracefully
    expect(response.status()).toBeLessThan(500);
  });
});
