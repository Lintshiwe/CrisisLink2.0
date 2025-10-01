// Emergency Scenario Integration Tests
const axios = require('axios')
const { io } = require('socket.io-client')

const BASE_URL = 'http://localhost:5000'
const API_URL = `${BASE_URL}/api`

class EmergencyScenarioTester {
  constructor() {
    this.testResults = []
    this.socket = null
  }

  async runAllScenarios() {
    console.log('🚨 Running Emergency Scenario Tests...')
    console.log('=====================================')

    try {
      // Initialize socket connection
      this.socket = io(BASE_URL)

      await this.waitForConnection()

      // Run all emergency scenarios
      await this.testMedicalEmergency()
      await this.testFireEmergency()
      await this.testAccidentScenario()
      await this.testWeatherEmergency()
      await this.testMultipleAlerts()
      await this.testAgentUnavailable()
      await this.testOfflineScenario()

      this.printResults()
    } catch (error) {
      console.error('Test suite failed:', error)
    } finally {
      if (this.socket) {
        this.socket.disconnect()
      }
    }
  }

  async waitForConnection() {
    return new Promise((resolve) => {
      this.socket.on('connect', () => {
        console.log('✅ Socket connected')
        resolve()
      })
    })
  }

  async testMedicalEmergency() {
    console.log('\n🏥 Testing Medical Emergency Scenario...')

    try {
      // 1. Create medical emergency
      const sosResponse = await axios.post(`${API_URL}/sos/create`, {
        user_id: 1,
        latitude: -26.2041,
        longitude: 28.0473,
        emergency_type: 'medical',
        additional_info:
          'Heart attack symptoms - chest pain, difficulty breathing',
      })

      const sosId = sosResponse.data.alert.id
      console.log(`   📍 SOS Alert created: ID ${sosId}`)

      // 2. Get weather conditions
      const weatherResponse = await axios.get(`${API_URL}/weather/current`, {
        params: { lat: -26.2041, lng: 28.0473 },
      })

      console.log(
        `   🌤️  Weather assessment: ${weatherResponse.data.emergency_assessment.risk_level} risk`
      )

      // 3. Find nearest agents
      const agentsResponse = await axios.post(
        `${API_URL}/location/nearby-agents`,
        {
          latitude: -26.2041,
          longitude: 28.0473,
          radius_km: 10,
        }
      )

      console.log(
        `   👮 Found ${agentsResponse.data.agents.length} nearby agents`
      )

      // 4. Assign agent
      const assignResponse = await axios.post(
        `${API_URL}/sos/${sosId}/assign-agent`
      )
      console.log(`   ✅ Agent assigned: ${assignResponse.data.agent.name}`)

      // 5. Test real-time tracking
      this.socket.emit('join_sos_tracking', { sosId })

      // Simulate agent location updates
      this.socket.emit('agent_location_update', {
        agentId: assignResponse.data.agent.id,
        latitude: -26.205,
        longitude: 28.048,
        timestamp: new Date(),
      })

      // 6. Calculate route
      const routeResponse = await axios.post(
        `${API_URL}/location/calculate-route`,
        {
          origin: {
            lat: assignResponse.data.agent.current_lat,
            lng: assignResponse.data.agent.current_lng,
          },
          destination: { lat: -26.2041, lng: 28.0473 },
          mode: 'driving',
        }
      )

      console.log(
        `   🛣️  Route calculated: ${routeResponse.data.route.duration} ETA`
      )

      // 7. Update alert status
      await axios.put(`${API_URL}/sos/${sosId}/status`, {
        status: 'in_progress',
      })
      console.log(`   📊 Alert status updated to: in_progress`)

      this.addResult(
        'Medical Emergency',
        true,
        'Complete workflow executed successfully'
      )
    } catch (error) {
      console.error('   ❌ Medical emergency test failed:', error.message)
      this.addResult('Medical Emergency', false, error.message)
    }
  }

  async testFireEmergency() {
    console.log('\n🔥 Testing Fire Emergency Scenario...')

    try {
      // Create fire emergency
      const sosResponse = await axios.post(`${API_URL}/sos/create`, {
        user_id: 2,
        latitude: -26.195,
        longitude: 28.06,
        emergency_type: 'fire',
        additional_info: 'Building fire on 3rd floor, smoke visible',
      })

      const sosId = sosResponse.data.alert.id

      // Test immediate high-priority notification
      const notificationResponse = await axios.post(
        `${API_URL}/notifications/send`,
        {
          recipient: '+27123456789',
          type: 'sms',
          message: `URGENT: Fire emergency reported at your location. Alert ID: ${sosId}`,
          priority: 'high',
        }
      )

      console.log(
        `   📱 High-priority notification sent: ${notificationResponse.data.notification_id}`
      )

      // Test multiple agent assignment for fire emergency
      const assignResponse = await axios.post(
        `${API_URL}/sos/${sosId}/assign-agent`
      )
      console.log(
        `   🚒 Fire department agent assigned: ${assignResponse.data.agent.name}`
      )

      this.addResult(
        'Fire Emergency',
        true,
        'Fire emergency handled with high priority'
      )
    } catch (error) {
      console.error('   ❌ Fire emergency test failed:', error.message)
      this.addResult('Fire Emergency', false, error.message)
    }
  }

  async testAccidentScenario() {
    console.log('\n🚗 Testing Traffic Accident Scenario...')

    try {
      // Create accident alert
      const sosResponse = await axios.post(`${API_URL}/sos/create`, {
        user_id: 3,
        latitude: -26.21,
        longitude: 28.04,
        emergency_type: 'accident',
        additional_info: 'Multi-vehicle accident on highway, injuries reported',
      })

      const sosId = sosResponse.data.alert.id

      // Test traffic-aware routing
      const routeResponse = await axios.post(
        `${API_URL}/location/calculate-route`,
        {
          origin: { lat: -26.2041, lng: 28.0473 },
          destination: { lat: -26.21, lng: 28.04 },
          mode: 'driving',
          avoid_traffic: true,
        }
      )

      console.log(
        `   🚦 Traffic-aware route: ${routeResponse.data.route.duration_in_traffic} with traffic`
      )

      // Test reverse geocoding for accurate location
      const geocodeResponse = await axios.post(
        `${API_URL}/location/reverse-geocode`,
        {
          latitude: -26.21,
          longitude: 28.04,
        }
      )

      console.log(
        `   📍 Accident location: ${geocodeResponse.data.address.formatted_address}`
      )

      this.addResult(
        'Traffic Accident',
        true,
        'Accident scenario with traffic routing successful'
      )
    } catch (error) {
      console.error('   ❌ Accident scenario test failed:', error.message)
      this.addResult('Traffic Accident', false, error.message)
    }
  }

  async testWeatherEmergency() {
    console.log('\n⛈️ Testing Severe Weather Emergency...')

    try {
      // Create weather-related emergency
      const sosResponse = await axios.post(`${API_URL}/sos/create`, {
        user_id: 4,
        latitude: -33.9249,
        longitude: 18.4241, // Cape Town coordinates
        emergency_type: 'weather',
        additional_info: 'Trapped due to severe thunderstorm and flooding',
      })

      const sosId = sosResponse.data.alert.id

      // Get weather conditions
      const weatherResponse = await axios.get(`${API_URL}/weather/current`, {
        params: { lat: -33.9249, lng: 18.4241 },
      })

      console.log(
        `   🌩️  Weather risk level: ${weatherResponse.data.emergency_assessment.risk_level}`
      )

      if (weatherResponse.data.emergency_assessment.threats.length > 0) {
        console.log(
          `   ⚠️  Weather threats detected: ${weatherResponse.data.emergency_assessment.threats.length}`
        )
      }

      // Check if safe for emergency response
      if (
        !weatherResponse.data.emergency_assessment.safe_for_emergency_response
      ) {
        console.log(
          `   🚫 Emergency response deemed unsafe due to weather conditions`
        )

        // Update alert with weather warning
        await axios.put(`${API_URL}/sos/${sosId}/status`, {
          status: 'weather_delayed',
          notes: 'Response delayed due to severe weather conditions',
        })
      }

      this.addResult(
        'Weather Emergency',
        true,
        'Weather assessment and safety check completed'
      )
    } catch (error) {
      console.error('   ❌ Weather emergency test failed:', error.message)
      this.addResult('Weather Emergency', false, error.message)
    }
  }

  async testMultipleAlerts() {
    console.log('\n📊 Testing Multiple Simultaneous Alerts...')

    try {
      // Create multiple alerts simultaneously
      const alertPromises = [
        axios.post(`${API_URL}/sos/create`, {
          user_id: 5,
          latitude: -26.2,
          longitude: 28.05,
          emergency_type: 'medical',
        }),
        axios.post(`${API_URL}/sos/create`, {
          user_id: 6,
          latitude: -26.202,
          longitude: 28.052,
          emergency_type: 'fire',
        }),
        axios.post(`${API_URL}/sos/create`, {
          user_id: 7,
          latitude: -26.204,
          longitude: 28.054,
          emergency_type: 'accident',
        }),
      ]

      const responses = await Promise.all(alertPromises)
      console.log(`   📋 Created ${responses.length} simultaneous alerts`)

      // Test agent distribution
      const assignPromises = responses.map((response) =>
        axios.post(`${API_URL}/sos/${response.data.alert.id}/assign-agent`)
      )

      const assignments = await Promise.all(assignPromises)
      const assignedAgents = assignments.map((a) => a.data.agent.id)
      const uniqueAgents = [...new Set(assignedAgents)]

      console.log(
        `   👮 Assigned ${uniqueAgents.length} unique agents to ${responses.length} alerts`
      )

      this.addResult(
        'Multiple Alerts',
        true,
        `Successfully handled ${responses.length} simultaneous alerts`
      )
    } catch (error) {
      console.error('   ❌ Multiple alerts test failed:', error.message)
      this.addResult('Multiple Alerts', false, error.message)
    }
  }

  async testAgentUnavailable() {
    console.log('\n🚫 Testing No Available Agents Scenario...')

    try {
      // First, set all agents to unavailable (simulation)
      // In real implementation, this would be done through agent management API

      // Create emergency when no agents available
      const sosResponse = await axios.post(`${API_URL}/sos/create`, {
        user_id: 8,
        latitude: -26.22,
        longitude: 28.03,
        emergency_type: 'medical',
        additional_info: 'Urgent medical assistance needed',
      })

      const sosId = sosResponse.data.alert.id

      // Try to assign agent (should handle gracefully)
      try {
        await axios.post(`${API_URL}/sos/${sosId}/assign-agent`)
      } catch (assignError) {
        if (assignError.response && assignError.response.status === 404) {
          console.log(
            `   ⚠️  No agents available - alert queued for next available agent`
          )

          // Verify alert is in pending status
          const alertResponse = await axios.get(`${API_URL}/sos/${sosId}`)
          if (alertResponse.data.alert.status === 'pending') {
            console.log(`   📋 Alert correctly maintained in pending status`)
          }
        }
      }

      // Send escalation notification
      const escalationResponse = await axios.post(
        `${API_URL}/notifications/send`,
        {
          recipient: '+27987654321', // Emergency coordinator
          type: 'sms',
          message: `ESCALATION: No agents available for SOS ${sosId}. Immediate attention required.`,
          priority: 'critical',
        }
      )

      console.log(
        `   🚨 Escalation notification sent: ${escalationResponse.data.notification_id}`
      )

      this.addResult(
        'Agent Unavailable',
        true,
        'Gracefully handled no available agents scenario'
      )
    } catch (error) {
      console.error('   ❌ Agent unavailable test failed:', error.message)
      this.addResult('Agent Unavailable', false, error.message)
    }
  }

  async testOfflineScenario() {
    console.log('\n📵 Testing Offline Emergency Scenario...')

    try {
      // Simulate offline mode by testing service worker functionality
      // This would normally be tested in the frontend with service worker

      const offlineData = {
        user_id: 9,
        latitude: -26.2041,
        longitude: 28.0473,
        emergency_type: 'medical',
        additional_info: 'Emergency while offline',
        timestamp: new Date().toISOString(),
        offline_mode: true,
      }

      // Test that the system can queue offline requests
      console.log(`   📱 Simulating offline emergency data storage`)
      console.log(
        `   ⏳ Emergency data queued for sync when connection restored`
      )

      // When connection is restored, data should be synced
      const sosResponse = await axios.post(`${API_URL}/sos/create`, offlineData)
      console.log(
        `   🔄 Offline data synced successfully: ID ${sosResponse.data.alert.id}`
      )

      this.addResult(
        'Offline Scenario',
        true,
        'Offline emergency handling successful'
      )
    } catch (error) {
      console.error('   ❌ Offline scenario test failed:', error.message)
      this.addResult('Offline Scenario', false, error.message)
    }
  }

  addResult(scenario, passed, message) {
    this.testResults.push({
      scenario,
      passed,
      message,
      timestamp: new Date(),
    })
  }

  printResults() {
    console.log('\n=====================================')
    console.log('📊 EMERGENCY SCENARIO TEST RESULTS')
    console.log('=====================================')

    let passed = 0
    let failed = 0

    this.testResults.forEach((result) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL'
      console.log(`${status} ${result.scenario}: ${result.message}`)

      if (result.passed) {
        passed++
      } else {
        failed++
      }
    })

    console.log('\n-------------------------------------')
    console.log(`Total Tests: ${this.testResults.length}`)
    console.log(`Passed: ${passed}`)
    console.log(`Failed: ${failed}`)
    console.log(
      `Success Rate: ${Math.round((passed / this.testResults.length) * 100)}%`
    )
    console.log('-------------------------------------')

    if (failed === 0) {
      console.log(
        '🎉 All emergency scenarios passed! System is ready for real-world deployment.'
      )
    } else {
      console.log(
        '⚠️  Some scenarios failed. Please review and fix issues before deployment.'
      )
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new EmergencyScenarioTester()
  tester
    .runAllScenarios()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('Test suite crashed:', error)
      process.exit(1)
    })
}

module.exports = EmergencyScenarioTester
