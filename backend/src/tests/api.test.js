// Backend API Integration Tests
const request = require('supertest');
const app = require('../server');
const pool = require('../database/db');

describe('CrisisLink Backend API Tests', () => {
  
  beforeAll(async () => {
    // Setup test database
    await pool.query(`
      DELETE FROM sos_alerts WHERE user_id = 999;
      DELETE FROM agents WHERE id IN (998, 999);
      DELETE FROM users WHERE id = 999;
    `);
    
    // Create test user
    await pool.query(`
      INSERT INTO users (id, phone_number, full_name, created_at)
      VALUES (999, '+27123456789', 'Test User', NOW())
    `);
    
    // Create test agents
    await pool.query(`
      INSERT INTO agents (id, full_name, badge_number, phone_number, current_lat, current_lng, status, created_at)
      VALUES 
        (998, 'Test Agent 1', 'TEST001', '+27987654321', -26.2041, 28.0473, 'available', NOW()),
        (999, 'Test Agent 2', 'TEST002', '+27987654322', -26.2100, 28.0400, 'available', NOW())
    `);
  });

  afterAll(async () => {
    // Cleanup test data
    await pool.query(`
      DELETE FROM sos_alerts WHERE user_id = 999;
      DELETE FROM agents WHERE id IN (998, 999);
      DELETE FROM users WHERE id = 999;
    `);
    await pool.end();
  });

  describe('1. SOS Alert Endpoints', () => {
    
    test('POST /api/sos/create - creates new SOS alert', async () => {
      const sosData = {
        user_id: 999,
        latitude: -26.2041,
        longitude: 28.0473,
        emergency_type: 'medical',
        additional_info: 'Chest pain'
      };

      const response = await request(app)
        .post('/api/sos/create')
        .send(sosData)
        .expect(201);

      expect(response.body.alert.id).toBeDefined();
      expect(response.body.alert.emergency_type).toBe('medical');
      expect(response.body.alert.status).toBe('pending');
      expect(response.body.alert.latitude).toBe(-26.2041);
    });

    test('POST /api/sos/create - validates required fields', async () => {
      const invalidSosData = {
        user_id: 999,
        latitude: -26.2041
        // Missing longitude, emergency_type
      };

      const response = await request(app)
        .post('/api/sos/create')
        .send(invalidSosData)
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });

    test('GET /api/sos/:id - retrieves SOS alert details', async () => {
      // First create an alert
      const sosData = {
        user_id: 999,
        latitude: -26.2041,
        longitude: 28.0473,
        emergency_type: 'fire',
        additional_info: 'Building fire'
      };

      const createResponse = await request(app)
        .post('/api/sos/create')
        .send(sosData);

      const sosId = createResponse.body.alert.id;

      // Then retrieve it
      const response = await request(app)
        .get(`/api/sos/${sosId}`)
        .expect(200);

      expect(response.body.alert.id).toBe(sosId);
      expect(response.body.alert.emergency_type).toBe('fire');
    });

    test('PUT /api/sos/:id/status - updates alert status', async () => {
      // Create alert first
      const createResponse = await request(app)
        .post('/api/sos/create')
        .send({
          user_id: 999,
          latitude: -26.2041,
          longitude: 28.0473,
          emergency_type: 'accident'
        });

      const sosId = createResponse.body.alert.id;

      // Update status
      const response = await request(app)
        .put(`/api/sos/${sosId}/status`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(response.body.alert.status).toBe('in_progress');
    });

    test('POST /api/sos/:id/assign-agent - assigns nearest agent', async () => {
      // Create alert
      const createResponse = await request(app)
        .post('/api/sos/create')
        .send({
          user_id: 999,
          latitude: -26.2041,
          longitude: 28.0473,
          emergency_type: 'medical'
        });

      const sosId = createResponse.body.alert.id;

      // Assign agent
      const response = await request(app)
        .post(`/api/sos/${sosId}/assign-agent`)
        .expect(200);

      expect(response.body.agent).toBeDefined();
      expect(response.body.agent.id).toBeOneOf([998, 999]);
      expect(response.body.alert.assigned_agent_id).toBe(response.body.agent.id);
    });
  });

  describe('2. Location Service Endpoints', () => {
    
    test('POST /api/location/nearby-agents - finds nearby agents', async () => {
      const locationData = {
        latitude: -26.2041,
        longitude: 28.0473,
        radius_km: 10
      };

      const response = await request(app)
        .post('/api/location/nearby-agents')
        .send(locationData)
        .expect(200);

      expect(response.body.agents).toBeArray();
      expect(response.body.agents.length).toBeGreaterThan(0);
      expect(response.body.agents[0]).toHaveProperty('distance_km');
    });

    test('POST /api/location/reverse-geocode - performs reverse geocoding', async () => {
      const locationData = {
        latitude: -26.2041,
        longitude: 28.0473
      };

      const response = await request(app)
        .post('/api/location/reverse-geocode')
        .send(locationData)
        .expect(200);

      expect(response.body.address).toBeDefined();
      expect(response.body.address.formatted_address).toContain('Johannesburg');
    });

    test('POST /api/location/calculate-route - calculates route between points', async () => {
      const routeData = {
        origin: { lat: -26.2041, lng: 28.0473 },
        destination: { lat: -26.2100, lng: 28.0400 },
        mode: 'driving'
      };

      const response = await request(app)
        .post('/api/location/calculate-route')
        .send(routeData)
        .expect(200);

      expect(response.body.route).toBeDefined();
      expect(response.body.route.distance).toBeDefined();
      expect(response.body.route.duration).toBeDefined();
    });
  });

  describe('3. Weather Service Endpoints', () => {
    
    test('GET /api/weather/current - gets current weather', async () => {
      const response = await request(app)
        .get('/api/weather/current')
        .query({ lat: -26.2041, lng: 28.0473 })
        .expect(200);

      expect(response.body.current).toBeDefined();
      expect(response.body.current.temperature).toBeDefined();
      expect(response.body.emergency_assessment).toBeDefined();
    });

    test('GET /api/weather/alerts - gets weather alerts', async () => {
      const response = await request(app)
        .get('/api/weather/alerts')
        .query({ lat: -26.2041, lng: 28.0473 })
        .expect(200);

      expect(response.body.alerts).toBeArray();
    });
  });

  describe('4. Notification Endpoints', () => {
    
    test('POST /api/notifications/send - sends notification', async () => {
      const notificationData = {
        recipient: '+27123456789',
        type: 'sms',
        message: 'Test emergency notification',
        priority: 'high'
      };

      const response = await request(app)
        .post('/api/notifications/send')
        .send(notificationData)
        .expect(200);

      expect(response.body.notification_id).toBeDefined();
      expect(response.body.status).toBe('sent');
    });

    test('POST /api/notifications/fcm - sends FCM notification', async () => {
      const fcmData = {
        token: 'test_fcm_token',
        title: 'Emergency Alert',
        body: 'SOS alert activated in your area',
        data: { sosId: '123' }
      };

      const response = await request(app)
        .post('/api/notifications/fcm')
        .send(fcmData)
        .expect(200);

      expect(response.body.message_id).toBeDefined();
    });
  });

  describe('5. Database Performance Tests', () => {
    
    test('nearby agents query performance', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/location/nearby-agents')
        .send({
          latitude: -26.2041,
          longitude: 28.0473,
          radius_km: 50
        });

      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
      expect(response.status).toBe(200);
    });

    test('SOS alert creation with location indexing', async () => {
      const alerts = [];
      const startTime = Date.now();

      // Create multiple alerts to test indexing performance
      for (let i = 0; i < 5; i++) {
        const sosData = {
          user_id: 999,
          latitude: -26.2041 + (i * 0.01),
          longitude: 28.0473 + (i * 0.01),
          emergency_type: 'test'
        };

        const response = await request(app)
          .post('/api/sos/create')
          .send(sosData);

        alerts.push(response.body.alert.id);
      }

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(2000); // All 5 should complete within 2 seconds

      // Cleanup
      for (const alertId of alerts) {
        await pool.query('DELETE FROM sos_alerts WHERE id = $1', [alertId]);
      }
    });
  });

  describe('6. Error Handling Tests', () => {
    
    test('handles invalid coordinates gracefully', async () => {
      const response = await request(app)
        .post('/api/location/nearby-agents')
        .send({
          latitude: 999, // Invalid latitude
          longitude: 28.0473,
          radius_km: 10
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid coordinates');
    });

    test('handles missing SOS alert', async () => {
      const response = await request(app)
        .get('/api/sos/99999')
        .expect(404);

      expect(response.body.error).toContain('SOS alert not found');
    });

    test('handles database connection errors', async () => {
      // Temporarily close database connection
      await pool.end();

      const response = await request(app)
        .get('/api/sos/1')
        .expect(500);

      expect(response.body.error).toContain('database');

      // Reconnect for other tests
      // This would need proper database connection handling in real app
    });
  });

  describe('7. Security Tests', () => {
    
    test('prevents SQL injection in SOS creation', async () => {
      const maliciousData = {
        user_id: "999; DROP TABLE sos_alerts; --",
        latitude: -26.2041,
        longitude: 28.0473,
        emergency_type: 'medical'
      };

      const response = await request(app)
        .post('/api/sos/create')
        .send(maliciousData)
        .expect(400);

      // Should reject invalid user_id format
      expect(response.body.error).toContain('Invalid user ID');
    });

    test('validates input sanitization', async () => {
      const xssData = {
        user_id: 999,
        latitude: -26.2041,
        longitude: 28.0473,
        emergency_type: 'medical',
        additional_info: '<script>alert("xss")</script>'
      };

      const response = await request(app)
        .post('/api/sos/create')
        .send(xssData)
        .expect(201);

      // Script tags should be sanitized
      expect(response.body.alert.additional_info).not.toContain('<script>');
    });
  });

  describe('8. Rate Limiting Tests', () => {
    
    test('enforces rate limiting on SOS creation', async () => {
      const sosData = {
        user_id: 999,
        latitude: -26.2041,
        longitude: 28.0473,
        emergency_type: 'medical'
      };

      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/sos/create')
            .send(sosData)
        );
      }

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});