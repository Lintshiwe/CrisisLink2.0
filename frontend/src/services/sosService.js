import axios from 'axios'

const API_BASE_URL =
  process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'

class SOSService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/api/sos`
  }

  async sendSOSAlert(alertData) {
    try {
      const response = await axios.post(`${this.baseURL}/alert`, alertData)
      return response.data
    } catch (error) {
      console.error('Error sending SOS alert:', error)
      throw error
    }
  }

  // Alias for components expecting createSOSAlert
  async createSOSAlert(alertData) {
    return this.sendSOSAlert(alertData)
  }

  async getSOSHistory(userId) {
    try {
      // Backend provides /history for current user
      const response = await axios.get(`${this.baseURL}/history`)
      return response.data
    } catch (error) {
      console.error('Error fetching SOS history:', error)
      throw error
    }
  }

  async cancelSOSAlert(alertId) {
    try {
      // Backend supports POST /:id/cancel alias
      const response = await axios.post(`${this.baseURL}/${alertId}/cancel`)
      return response.data
    } catch (error) {
      console.error('Error cancelling SOS alert:', error)
      throw error
    }
  }

  async updateSOSStatus(alertId, status) {
    try {
      const response = await axios.put(`${this.baseURL}/${alertId}/status`, {
        status,
      })
      return response.data
    } catch (error) {
      console.error('Error updating SOS status:', error)
      throw error
    }
  }
}

export const sosService = new SOSService()
export default sosService
