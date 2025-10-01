import React, { useState, useEffect, useRef, useContext } from 'react'
import {
  Send,
  Phone,
  MapPin,
  AlertTriangle,
  Clock,
  CheckCircle,
} from 'lucide-react'
import SocketContext from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const SosChat = ({ alertId, onClose }) => {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [agentInfo, setAgentInfo] = useState(null)
  const [sosStatus, setSosStatus] = useState('pending') // pending, assigned, en-route, arrived, resolved
  const messagesEndRef = useRef(null)

  const { socket, sendSosResponse } = useContext(SocketContext)
  const { user } = useAuth()

  useEffect(() => {
    if (!socket) return

    // Listen for agent assignment
    const handleAgentAssigned = (data) => {
      if (data.alertId === alertId) {
        setAgentInfo({
          id: data.agentId,
          name: data.agentName,
          estimatedArrival: data.estimatedArrival,
        })
        setSosStatus('assigned')
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: 'system',
            content: data.message,
            timestamp: new Date(data.timestamp),
          },
        ])
        toast.success(`Agent ${data.agentName} is coming to help!`)
      }
    }

    // Listen for agent messages
    const handleAgentMessage = (data) => {
      if (data.alertId === alertId) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: 'agent',
            sender: data.agentName,
            content: data.message,
            timestamp: new Date(data.timestamp),
          },
        ])
        toast(`Message from ${data.agentName}`)
      }
    }

    // Listen for SOS status updates
    const handleStatusUpdate = (data) => {
      if (data.alertId === alertId) {
        setSosStatus(data.status)
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            type: 'system',
            content: data.message || `Status updated to: ${data.status}`,
            timestamp: new Date(data.timestamp),
          },
        ])

        if (data.status === 'arrived') {
          toast.success('Help has arrived!')
        } else if (data.status === 'resolved') {
          toast.success('Emergency resolved')
        }
      }
    }

    socket.on('sos-agent-assigned', handleAgentAssigned)
    socket.on('sos-agent-message', handleAgentMessage)
    socket.on('sos-status-changed', handleStatusUpdate)

    return () => {
      socket.off('sos-agent-assigned', handleAgentAssigned)
      socket.off('sos-agent-message', handleAgentMessage)
      socket.off('sos-status-changed', handleStatusUpdate)
    }
  }, [socket, alertId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    const message = {
      id: Date.now(),
      type: 'user',
      sender: user?.name || 'You',
      content: newMessage,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, message])
    sendSosResponse(alertId, newMessage)
    setNewMessage('')
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500'
      case 'assigned':
        return 'text-blue-500'
      case 'en-route':
        return 'text-orange-500'
      case 'arrived':
        return 'text-green-500'
      case 'resolved':
        return 'text-gray-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'assigned':
        return <Phone className="w-4 h-4" />
      case 'en-route':
        return <MapPin className="w-4 h-4" />
      case 'arrived':
        return <CheckCircle className="w-4 h-4" />
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />
      default:
        return <AlertTriangle className="w-4 h-4" />
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-red-600 text-white p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <h2 className="font-bold">Emergency Response</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>

          {/* Status Bar */}
          <div
            className={`flex items-center space-x-2 mt-2 ${getStatusColor(sosStatus)}`}
          >
            {getStatusIcon(sosStatus)}
            <span className="text-sm font-medium capitalize">
              {sosStatus === 'en-route' ? 'En Route' : sosStatus}
            </span>
          </div>

          {/* Agent Info */}
          {agentInfo && (
            <div className="mt-2 text-sm">
              <p>
                Agent: <span className="font-semibold">{agentInfo.name}</span>
              </p>
              {agentInfo.estimatedArrival && (
                <p>
                  ETA:{' '}
                  {new Date(agentInfo.estimatedArrival).toLocaleTimeString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-red-500" />
              <p className="font-semibold">Emergency alert sent!</p>
              <p className="text-sm">
                Connecting you with emergency services...
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.type === 'agent'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-700'
                }`}
              >
                {message.type !== 'user' && message.sender && (
                  <p className="font-semibold mb-1">{message.sender}</p>
                )}
                <p>{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        {sosStatus !== 'resolved' && (
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  agentInfo
                    ? `Message ${agentInfo.name}...`
                    : 'Waiting for agent assignment...'
                }
                disabled={!agentInfo}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || !agentInfo}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SosChat
