const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');
const locationService = require('../services/locationService');

// Get agent location
router.get('/agent/:agentId', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    
    const result = await db.query(
      'SELECT current_lat, current_lng, last_location_update, status FROM agents WHERE id = $1',
      [agentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = result.rows[0];
    res.json({
      agent_id: agentId,
      latitude: agent.current_lat,
      longitude: agent.current_lng,
      last_update: agent.last_location_update,
      status: agent.status
    });

  } catch (error) {
    console.error('Error getting agent location:', error);
    res.status(500).json({ error: 'Failed to get agent location' });
  }
});

// Update agent location
router.post('/agent/:agentId/update', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { latitude, longitude, accuracy, speed, heading } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // Update agent location in database
    const result = await db.query(`
      UPDATE agents 
      SET current_lat = $1, 
          current_lng = $2, 
          last_location_update = CURRENT_TIMESTAMP,
          location_accuracy = $3,
          speed = $4,
          heading = $5
      WHERE id = $6 
      RETURNING *
    `, [latitude, longitude, accuracy, speed, heading, agentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = result.rows[0];

    // Emit location update via Socket.IO
    req.app.get('io').emit('agent_location_update', {
      agentId: parseInt(agentId),
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      timestamp: new Date(),
      agent: agent
    });

    // Check if agent is assigned to any active SOS alerts
    const sosResult = await db.query(`
      SELECT s.*, u.name as user_name 
      FROM sos_alerts s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.assigned_agent_id = $1 AND s.status IN ('dispatched', 'in_progress')
    `, [agentId]);

    if (sosResult.rows.length > 0) {
      for (const sosAlert of sosResult.rows) {
        // Calculate distance to user
        const distance = locationService.calculateDistance(
          latitude,
          longitude,
          parseFloat(sosAlert.latitude),
          parseFloat(sosAlert.longitude)
        );

        // Check if agent is close to user (within 50 meters)
        if (distance.meters <= 50 && sosAlert.status !== 'agent_arrived') {
          // Update SOS status to agent_arrived
          await db.query(
            'UPDATE sos_alerts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['agent_arrived', sosAlert.id]
          );

          // Notify user that agent has arrived
          req.app.get('io').emit('agent_arrived', {
            sosId: sosAlert.id,
            agentId: parseInt(agentId),
            message: `Agent ${agent.name} has arrived at your location`
          });
        } else {
          // Send location update for active tracking
          req.app.get('io').emit('sos_tracking_update', {
            sosId: sosAlert.id,
            agentId: parseInt(agentId),
            agentLocation: { latitude, longitude },
            distance: distance,
            estimatedArrival: locationService.calculateETA(
              latitude,
              longitude,
              parseFloat(sosAlert.latitude),
              parseFloat(sosAlert.longitude)
            )
          });
        }
      }
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      agent: {
        id: agent.id,
        name: agent.name,
        latitude,
        longitude,
        last_update: new Date(),
        distance_info: sosResult.rows.length > 0 ? {
          to_user_km: sosResult.rows[0] ? locationService.calculateDistance(
            latitude,
            longitude,
            parseFloat(sosResult.rows[0].latitude),
            parseFloat(sosResult.rows[0].longitude)
          ).kilometers : null
        } : null
      }
    });

  } catch (error) {
    console.error('Error updating agent location:', error);
    res.status(500).json({ error: 'Failed to update agent location' });
  }
});

// Get tracking info for SOS alert
router.get('/sos/:sosId/tracking', authenticateToken, async (req, res) => {
  try {
    const { sosId } = req.params;

    const result = await db.query(`
      SELECT 
        s.*,
        a.id as agent_id,
        a.name as agent_name,
        a.phone as agent_phone,
        a.badge_number,
        a.current_lat as agent_lat,
        a.current_lng as agent_lng,
        a.last_location_update,
        a.vehicle_info,
        u.name as user_name
      FROM sos_alerts s
      LEFT JOIN agents a ON s.assigned_agent_id = a.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `, [sosId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SOS alert not found' });
    }

    const sosData = result.rows[0];
    
    // Calculate distance and ETA if agent is assigned
    let trackingInfo = null;
    if (sosData.agent_lat && sosData.agent_lng) {
      const distance = locationService.calculateDistance(
        parseFloat(sosData.agent_lat),
        parseFloat(sosData.agent_lng),
        parseFloat(sosData.latitude),
        parseFloat(sosData.longitude)
      );

      trackingInfo = {
        distance_km: distance.kilometers,
        distance_meters: distance.meters,
        estimated_arrival: locationService.calculateETA(
          parseFloat(sosData.agent_lat),
          parseFloat(sosData.agent_lng),
          parseFloat(sosData.latitude),
          parseFloat(sosData.longitude)
        )
      };
    }

    res.json({
      sos_alert: {
        id: sosData.id,
        user_name: sosData.user_name,
        emergency_type: sosData.emergency_type,
        status: sosData.status,
        latitude: sosData.latitude,
        longitude: sosData.longitude,
        created_at: sosData.created_at,
        additional_info: sosData.additional_info
      },
      agent: sosData.agent_id ? {
        id: sosData.agent_id,
        name: sosData.agent_name,
        phone: sosData.agent_phone,
        badge_number: sosData.badge_number,
        current_location: {
          latitude: sosData.agent_lat,
          longitude: sosData.agent_lng,
          last_update: sosData.last_location_update
        },
        vehicle_info: sosData.vehicle_info
      } : null,
      tracking: trackingInfo
    });

  } catch (error) {
    console.error('Error getting tracking info:', error);
    res.status(500).json({ error: 'Failed to get tracking information' });
  }
});

// Get nearby agents for a location
router.post('/nearby-agents', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, radius_km = 10, limit = 10 } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const result = await db.query(`
      SELECT 
        id,
        name,
        phone,
        badge_number,
        status,
        current_lat,
        current_lng,
        last_location_update,
        vehicle_info,
        ST_Distance(
          ST_Point($2, $1)::geography,
          ST_Point(current_lng, current_lat)::geography
        ) / 1000 as distance_km
      FROM agents
      WHERE status = 'available'
        AND current_lat IS NOT NULL 
        AND current_lng IS NOT NULL
        AND ST_DWithin(
          ST_Point($2, $1)::geography,
          ST_Point(current_lng, current_lat)::geography,
          $3 * 1000
        )
      ORDER BY distance_km ASC
      LIMIT $4
    `, [latitude, longitude, radius_km, limit]);

    const agents = result.rows.map(agent => ({
      ...agent,
      distance_km: parseFloat(agent.distance_km).toFixed(2)
    }));

    res.json({
      location: { latitude, longitude },
      radius_km,
      agents_found: agents.length,
      agents
    });

  } catch (error) {
    console.error('Error finding nearby agents:', error);
    res.status(500).json({ error: 'Failed to find nearby agents' });
  }
});

// Start location tracking session
router.post('/tracking/start', authenticateToken, async (req, res) => {
  try {
    const { sosId, agentId } = req.body;

    if (!sosId || !agentId) {
      return res.status(400).json({ error: 'SOS ID and Agent ID are required' });
    }

    // Verify SOS alert exists and agent is assigned
    const result = await db.query(
      'SELECT * FROM sos_alerts WHERE id = $1 AND assigned_agent_id = $2',
      [sosId, agentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SOS alert not found or agent not assigned' });
    }

    // Update SOS status to tracking
    await db.query(
      'UPDATE sos_alerts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['in_progress', sosId]
    );

    // Emit tracking started event
    req.app.get('io').emit('tracking_started', {
      sosId: parseInt(sosId),
      agentId: parseInt(agentId),
      message: 'Live tracking has started'
    });

    res.json({
      success: true,
      message: 'Tracking session started',
      tracking_id: `${sosId}_${agentId}_${Date.now()}`
    });

  } catch (error) {
    console.error('Error starting tracking session:', error);
    res.status(500).json({ error: 'Failed to start tracking session' });
  }
});

// Stop location tracking session
router.post('/tracking/stop', authenticateToken, async (req, res) => {
  try {
    const { sosId, agentId, reason = 'completed' } = req.body;

    if (!sosId || !agentId) {
      return res.status(400).json({ error: 'SOS ID and Agent ID are required' });
    }

    // Update SOS status
    const newStatus = reason === 'completed' ? 'completed' : 'cancelled';
    await db.query(
      'UPDATE sos_alerts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStatus, sosId]
    );

    // Update agent status back to available
    await db.query(
      'UPDATE agents SET status = $1 WHERE id = $2',
      ['available', agentId]
    );

    // Emit tracking stopped event
    req.app.get('io').emit('tracking_stopped', {
      sosId: parseInt(sosId),
      agentId: parseInt(agentId),
      reason,
      message: `Tracking session ${reason}`
    });

    res.json({
      success: true,
      message: `Tracking session ${reason}`,
      final_status: newStatus
    });

  } catch (error) {
    console.error('Error stopping tracking session:', error);
    res.status(500).json({ error: 'Failed to stop tracking session' });
  }
});

module.exports = router;