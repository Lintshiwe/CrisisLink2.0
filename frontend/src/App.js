import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { LocationProvider } from './contexts/LocationContext'
import { SocketProvider } from './contexts/SocketContext'
import { WeatherProvider } from './contexts/WeatherContext'

// Pages
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import SOSPage from './pages/SOSPage'
import RescueStatusPage from './pages/RescueStatusPage'
import ProfilePage from './pages/ProfilePage'
import AgentDashboard from './pages/AgentDashboard'
import AdminDashboard from './pages/AdminDashboard'
import ServiceManagementPage from './pages/ServiceManagementPage'
import TestTrackingPage from './pages/TestTrackingPage'

// Components
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LocationProvider>
            <WeatherProvider>
              <SocketProvider>
                <Router>
                  <div className="App min-h-screen bg-dark-900">
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route
                        path="/test-tracking"
                        element={<TestTrackingPage />}
                      />

                      {/* Protected Routes - Allow guest access for basic features */}
                      <Route
                        path="/"
                        element={
                          <ProtectedRoute allowGuest={true}>
                            <Layout>
                              <HomePage />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/sos"
                        element={
                          <ProtectedRoute allowGuest={true}>
                            <Layout>
                              <SOSPage />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/rescue/:sosId"
                        element={
                          <ProtectedRoute allowGuest={true}>
                            <Layout>
                              <RescueStatusPage />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute allowGuest={false}>
                            <Layout>
                              <ProfilePage />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />

                      {/* Agent Routes */}
                      <Route
                        path="/agent"
                        element={
                          <ProtectedRoute requiredRole="agent">
                            <Layout>
                              <AgentDashboard />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />

                      {/* Admin Routes */}
                      <Route
                        path="/admin"
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <Layout>
                              <AdminDashboard />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/admin/services"
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <Layout>
                              <ServiceManagementPage />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                    </Routes>

                    {/* Global Toast Notifications */}
                    <Toaster
                      position="top-center"
                      toastOptions={{
                        duration: 4000,
                        style: {
                          background: '#1e293b',
                          color: '#ffffff',
                          border: '1px solid #334155',
                        },
                        success: {
                          iconTheme: {
                            primary: '#22c55e',
                            secondary: '#ffffff',
                          },
                        },
                        error: {
                          iconTheme: {
                            primary: '#ef4444',
                            secondary: '#ffffff',
                          },
                        },
                      }}
                    />
                  </div>
                </Router>
              </SocketProvider>
            </WeatherProvider>
          </LocationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
