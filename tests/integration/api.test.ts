const request = require('supertest');

const API_BASE_URL = 'http://localhost:8080';

describe('eVault API Integration Tests', () => {
  describe('Health and Status Endpoints', () => {
    test('GET /health - should return healthy status', async () => {
      const response = await request(API_BASE_URL)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'evault-server');
    });

    test('GET /api/status - should return API status', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/status')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveProperty('auth');
      expect(response.body.endpoints).toHaveProperty('protected');
    });
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/auth/url - should return Google OAuth URL', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/url')
        .send({
          redirect_uri: 'http://localhost:3000/auth/callback'
        })
        .expect(200);

      expect(response.body).toHaveProperty('url');
      expect(response.body.url).toContain('accounts.google.com');
      expect(response.body.url).toContain('oauth2');
    });

    test('POST /api/auth/callback - should handle invalid token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/callback')
        .send({
          access_token: 'invalid-token',
          user: {
            id: 'test-user-id',
            email: 'test@example.com'
          }
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('GET /api/user - should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/user')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Protected Endpoints (without auth)', () => {
    test('POST /api/vault/register - should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/vault/register')
        .send({
          pin: 'test123456',
          openadp_metadata: 'test-metadata'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('POST /api/vault/recover - should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/vault/recover')
        .send({
          pin: 'test123456'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('GET /api/vault/status - should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/vault/status')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('POST /api/entries - should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/entries')
        .send({
          name: 'test-entry',
          hpke_blob: 'dGVzdC1kYXRh', // base64: test-data
          deletion_hash: 'dGVzdC1oYXNo' // base64: test-hash
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('GET /api/entries - should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/entries')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('GET /api/entries/list - should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/entries/list')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    test('DELETE /api/entries - should require authentication', async () => {
      const response = await request(API_BASE_URL)
        .delete('/api/entries')
        .send({
          name: 'test-entry',
          deletion_pre_hash: 'dGVzdC1wcmUtaGFzaA==' // base64: test-pre-hash
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting', () => {
    test('Should enforce rate limiting after many requests', async () => {
      // Make many requests quickly to trigger rate limiting
      const promises = Array(50).fill(0).map(() => 
        request(API_BASE_URL).get('/api/status')
      );

      const responses = await Promise.all(promises);
      
      // Check that at least some requests were rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      
      // With 100 requests per minute limit, we should see some 429 responses
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('CORS Headers', () => {
    test('Should include proper CORS headers', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/status')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });

    test('Should handle OPTIONS preflight requests', async () => {
      const response = await request(API_BASE_URL)
        .options('/api/auth/url')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });

  describe('Input Validation', () => {
    test('POST /api/auth/url - should validate redirect_uri', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/url')
        .send({}) // Missing redirect_uri
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('Protected endpoints should validate request format', async () => {
      // These will fail auth first, but we can test with malformed JSON
      const response = await request(API_BASE_URL)
        .post('/api/vault/register')
        .send('invalid-json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Security Headers', () => {
    test('Should include security headers', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/status')
        .expect(200);

      // Check for security headers added by our middleware
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });
  });
}); 