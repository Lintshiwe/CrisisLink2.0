// Comprehensive Notifications and Redirection Service with FCM
import FirebaseTrackingService from './FirebaseTrackingService';

class NotificationRedirectionService {
  constructor() {
    this.notificationQueue = [];
    this.redirectionRules = new Map();
    this.activeRedirections = new Map();
    this.notificationHistory = [];
    this.serviceWorkerRegistration = null;
    this.isInitialized = false;
  }

  // Initialize the service
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize Firebase for notifications
      await FirebaseTrackingService.initialize();

      // Register service worker for background notifications
      await this.registerServiceWorker();

      // Set up notification event handlers
      this.setupNotificationHandlers();

      // Request notification permissions
      await this.requestNotificationPermission();

      this.isInitialized = true;
      console.log('Notification & Redirection Service initialized');

    } catch (error) {
      console.error('Notification service initialization error:', error);
      throw error;
    }
  }

  // Register service worker for background notifications
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Setup notification event handlers
  setupNotificationHandlers() {
    // Handle notification clicks
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data.type === 'NOTIFICATION_CLICK') {
        this.handleNotificationClick(event.data.payload);
      }
    });

    // Listen to Firebase notifications
    FirebaseTrackingService.onNotification((payload) => {
      this.processFirebaseNotification(payload);
    });
  }

  // Request notification permission
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'granted') {
      console.log('Notification permission granted');
      return true;
    } else {
      console.warn('Notification permission denied');
      return false;
    }
  }

  // Send emergency notification
  async sendEmergencyNotification(type, data, options = {}) {
    try {
      const notification = {
        id: Date.now().toString(),
        type,
        data,
        timestamp: new Date(),
        priority: options.priority || 'high',
        persistent: options.persistent || true,
        sound: options.sound || 'emergency',
        vibration: options.vibration || [200, 100, 200, 100, 200],
        actions: options.actions || this.getDefaultActions(type)
      };

      // Add to queue
      this.notificationQueue.push(notification);

      // Send via multiple channels
      await Promise.all([
        this.sendPushNotification(notification),
        this.sendInAppNotification(notification),
        this.sendBrowserNotification(notification),
        options.sms && this.sendSMSNotification(notification),
        options.voice && this.sendVoiceNotification(notification)
      ]);

      // Add to history
      this.notificationHistory.push(notification);

      // Handle automatic redirections
      if (options.redirect) {
        await this.handleRedirection(notification, options.redirect);
      }

      return notification;

    } catch (error) {
      console.error('Emergency notification error:', error);
      throw error;
    }
  }

  // Send push notification via FCM
  async sendPushNotification(notification) {
    try {
      await FirebaseTrackingService.sendEmergencyNotification(
        notification.type,
        {
          ...notification.data,
          notification_id: notification.id,
          timestamp: notification.timestamp.toISOString()
        }
      );
    } catch (error) {
      console.error('Push notification error:', error);
    }
  }

  // Send in-app notification
  async sendInAppNotification(notification) {
    const event = new CustomEvent('emergency_notification', {
      detail: notification
    });
    window.dispatchEvent(event);
  }

  // Send browser notification
  async sendBrowserNotification(notification) {
    if (Notification.permission !== 'granted') return;

    try {
      const { title, body, icon, actions } = this.formatNotificationContent(notification);

      const browserNotification = new Notification(title, {
        body,
        icon: icon || '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: notification.type,
        data: notification.data,
        requireInteraction: notification.priority === 'high',
        silent: false,
        vibrate: notification.vibration,
        actions: actions.slice(0, 2) // Browser limit
      });

      browserNotification.onclick = () => {
        this.handleNotificationClick(notification);
        browserNotification.close();
      };

      // Auto-close after delay (except for high priority)
      if (notification.priority !== 'high') {
        setTimeout(() => {
          browserNotification.close();
        }, 10000);
      }

    } catch (error) {
      console.error('Browser notification error:', error);
    }
  }

  // Send SMS notification
  async sendSMSNotification(notification) {
    try {
      const response = await fetch('/api/notifications/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type: notification.type,
          message: this.formatSMSMessage(notification),
          data: notification.data
        })
      });

      if (!response.ok) {
        throw new Error('SMS notification failed');
      }

    } catch (error) {
      console.error('SMS notification error:', error);
    }
  }

  // Send voice notification
  async sendVoiceNotification(notification) {
    try {
      const response = await fetch('/api/notifications/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type: notification.type,
          message: this.formatVoiceMessage(notification),
          data: notification.data
        })
      });

      if (!response.ok) {
        throw new Error('Voice notification failed');
      }

    } catch (error) {
      console.error('Voice notification error:', error);
    }
  }

  // Format notification content
  formatNotificationContent(notification) {
    const formatters = {
      sos_alert: (data) => ({
        title: '🚨 Emergency SOS Alert',
        body: `Emergency assistance requested at ${data.location || 'unknown location'}`,
        icon: '/icons/emergency.png'
      }),
      agent_assigned: (data) => ({
        title: '🚑 Emergency Response Assigned',
        body: `Agent ${data.agent_name} has been assigned to your emergency`,
        icon: '/icons/agent.png'
      }),
      agent_arrived: (data) => ({
        title: '✅ Help Has Arrived',
        body: `Emergency responder has arrived at your location`,
        icon: '/icons/arrived.png'
      }),
      weather_alert: (data) => ({
        title: '🌦️ Severe Weather Alert',
        body: `${data.severity} weather conditions detected: ${data.description}`,
        icon: '/icons/weather.png'
      }),
      route_redirect: (data) => ({
        title: '🧭 Route Redirection',
        body: `Alternative route suggested due to ${data.reason}`,
        icon: '/icons/redirect.png'
      })
    };

    const formatter = formatters[notification.type] || ((data) => ({
      title: 'Emergency Notification',
      body: 'Important emergency information',
      icon: '/icons/default.png'
    }));

    return {
      ...formatter(notification.data),
      actions: notification.actions
    };
  }

  // Format SMS message
  formatSMSMessage(notification) {
    const formatters = {
      sos_alert: (data) => 
        `EMERGENCY: SOS alert activated at ${data.location}. Help is being dispatched.`,
      agent_assigned: (data) => 
        `UPDATE: Agent ${data.agent_name} assigned to your emergency. ETA: ${data.eta}`,
      agent_arrived: (data) => 
        `HELP ARRIVED: Emergency responder at your location. Contact: ${data.agent_phone}`,
      weather_alert: (data) => 
        `WEATHER ALERT: ${data.severity} conditions - ${data.description}. Stay safe.`
    };

    const formatter = formatters[notification.type] || 
      ((data) => 'Emergency notification from CrisisLink');

    return formatter(notification.data);
  }

  // Format voice message
  formatVoiceMessage(notification) {
    const formatters = {
      sos_alert: (data) => 
        `This is CrisisLink emergency services. Your SOS alert has been received. Help is being dispatched to your location.`,
      agent_assigned: (data) => 
        `This is CrisisLink. Agent ${data.agent_name} has been assigned to your emergency and is on the way.`,
      agent_arrived: (data) => 
        `This is CrisisLink. Your emergency responder has arrived at your location.`,
      weather_alert: (data) => 
        `This is CrisisLink weather alert. Severe weather conditions detected in your area. Please take appropriate safety measures.`
    };

    const formatter = formatters[notification.type] || 
      ((data) => 'This is an emergency notification from CrisisLink.');

    return formatter(notification.data);
  }

  // Get default actions for notification type
  getDefaultActions(type) {
    const actions = {
      sos_alert: [
        { action: 'view', title: 'View Status', icon: '/icons/view.png' },
        { action: 'call', title: 'Call 911', icon: '/icons/call.png' }
      ],
      agent_assigned: [
        { action: 'track', title: 'Track Agent', icon: '/icons/track.png' },
        { action: 'message', title: 'Send Message', icon: '/icons/message.png' }
      ],
      weather_alert: [
        { action: 'details', title: 'View Details', icon: '/icons/details.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' }
      ],
      route_redirect: [
        { action: 'accept', title: 'Accept Route', icon: '/icons/accept.png' },
        { action: 'decline', title: 'Keep Current', icon: '/icons/decline.png' }
      ]
    };

    return actions[type] || [
      { action: 'view', title: 'View', icon: '/icons/view.png' }
    ];
  }

  // Handle notification click
  handleNotificationClick(notification) {
    const handlers = {
      sos_alert: (data) => {
        window.location.href = `/sos/${data.sosId}`;
      },
      agent_assigned: (data) => {
        window.location.href = `/tracking/${data.sosId}`;
      },
      agent_arrived: (data) => {
        window.location.href = `/communication/${data.sosId}`;
      },
      weather_alert: (data) => {
        window.location.href = `/weather/alert/${data.alertId}`;
      },
      route_redirect: (data) => {
        this.handleRouteRedirection(data);
      }
    };

    const handler = handlers[notification.type];
    if (handler) {
      handler(notification.data);
    } else {
      window.focus();
    }
  }

  // Handle route redirection with Google Directions API
  async handleRouteRedirection(data) {
    try {
      if (!window.google) {
        throw new Error('Google Maps not loaded');
      }

      const directionsService = new window.google.maps.DirectionsService();

      // Calculate alternative routes
      const alternatives = await this.calculateAlternativeRoutes(
        data.origin,
        data.destination,
        data.avoidConditions
      );

      // Show redirection options
      this.showRedirectionDialog(alternatives, data);

    } catch (error) {
      console.error('Route redirection error:', error);
      this.fallbackRedirection(data);
    }
  }

  // Calculate alternative routes
  async calculateAlternativeRoutes(origin, destination, avoidConditions) {
    const directionsService = new window.google.maps.DirectionsService();
    
    const baseRequest = {
      origin,
      destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: window.google.maps.TrafficModel.BEST_GUESS
      },
      provideRouteAlternatives: true
    };

    // Create requests with different avoidance options
    const requests = [
      { ...baseRequest }, // Default route
      { ...baseRequest, avoidHighways: true },
      { ...baseRequest, avoidTolls: true },
      { ...baseRequest, avoidHighways: true, avoidTolls: true }
    ];

    const results = [];
    
    for (const request of requests) {
      try {
        const result = await new Promise((resolve, reject) => {
          directionsService.route(request, (result, status) => {
            if (status === 'OK') {
              resolve(result);
            } else {
              reject(new Error(`Route calculation failed: ${status}`));
            }
          });
        });

        results.push(...result.routes.map((route, index) => ({
          route,
          avoidance: {
            highways: request.avoidHighways || false,
            tolls: request.avoidTolls || false
          },
          duration: route.legs[0].duration,
          distance: route.legs[0].distance,
          duration_in_traffic: route.legs[0].duration_in_traffic
        })));

      } catch (error) {
        console.error('Route calculation error:', error);
      }
    }

    // Remove duplicates and sort by duration
    const uniqueRoutes = this.removeDuplicateRoutes(results);
    return uniqueRoutes.sort((a, b) => {
      const aDuration = a.duration_in_traffic?.value || a.duration.value;
      const bDuration = b.duration_in_traffic?.value || b.duration.value;
      return aDuration - bDuration;
    });
  }

  // Remove duplicate routes
  removeDuplicateRoutes(routes) {
    const unique = [];
    const seen = new Set();

    for (const route of routes) {
      const signature = route.route.summary + 
        route.duration.value + 
        route.distance.value;
      
      if (!seen.has(signature)) {
        seen.add(signature);
        unique.push(route);
      }
    }

    return unique;
  }

  // Show redirection dialog
  showRedirectionDialog(alternatives, data) {
    const event = new CustomEvent('show_redirection_dialog', {
      detail: {
        alternatives,
        originalData: data,
        onRouteSelected: (selectedRoute) => {
          this.applyRouteRedirection(selectedRoute, data);
        }
      }
    });

    window.dispatchEvent(event);
  }

  // Apply route redirection
  async applyRouteRedirection(selectedRoute, data) {
    try {
      // Store the redirection
      this.activeRedirections.set(data.sosId || data.routeId, {
        originalRoute: data.originalRoute,
        newRoute: selectedRoute,
        reason: data.reason,
        timestamp: new Date()
      });

      // Notify the tracking system
      const event = new CustomEvent('route_redirected', {
        detail: {
          newRoute: selectedRoute,
          reason: data.reason,
          sosId: data.sosId
        }
      });

      window.dispatchEvent(event);

      // Send confirmation notification
      await this.sendEmergencyNotification('route_updated', {
        sosId: data.sosId,
        newETA: selectedRoute.duration_in_traffic?.text || selectedRoute.duration.text,
        reason: data.reason
      });

    } catch (error) {
      console.error('Route redirection application error:', error);
    }
  }

  // Fallback redirection (basic alert)
  fallbackRedirection(data) {
    const message = `Route redirection suggested due to ${data.reason}. ` +
      `Please use alternative routes to reach your destination.`;
    
    alert(message);
  }

  // Process Firebase notification
  processFirebaseNotification(payload) {
    const { notification, data } = payload;
    
    // Convert to internal format
    const internalNotification = {
      id: data.notification_id || Date.now().toString(),
      type: data.type || 'general',
      data: data,
      timestamp: new Date(data.timestamp || Date.now()),
      priority: data.priority || 'medium',
      title: notification.title,
      body: notification.body
    };

    // Add to history
    this.notificationHistory.push(internalNotification);

    // Handle based on type
    if (data.type === 'route_redirect') {
      this.handleRouteRedirection(data);
    }
  }

  // Get notification history
  getNotificationHistory(limit = 50) {
    return this.notificationHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Clear old notifications
  clearOldNotifications(olderThanHours = 24) {
    const cutoff = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    this.notificationHistory = this.notificationHistory.filter(
      notification => notification.timestamp > cutoff
    );
  }

  // Subscribe to notifications
  onNotification(callback) {
    const handler = (event) => callback(event.detail);
    window.addEventListener('emergency_notification', handler);
    
    return () => {
      window.removeEventListener('emergency_notification', handler);
    };
  }

  // Subscribe to route redirections
  onRouteRedirection(callback) {
    const handler = (event) => callback(event.detail);
    window.addEventListener('route_redirected', handler);
    
    return () => {
      window.removeEventListener('route_redirected', handler);
    };
  }

  // Get active redirections
  getActiveRedirections() {
    return Array.from(this.activeRedirections.entries()).map(([id, data]) => ({
      id,
      ...data
    }));
  }

  // Clear active redirection
  clearRedirection(id) {
    this.activeRedirections.delete(id);
  }

  // Test notification system
  async testNotifications() {
    try {
      await this.sendEmergencyNotification('test', {
        message: 'This is a test notification from CrisisLink',
        timestamp: new Date().toISOString()
      }, {
        priority: 'low',
        sound: 'default'
      });

      console.log('Test notification sent successfully');
      return true;

    } catch (error) {
      console.error('Test notification failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const notificationRedirectionService = new NotificationRedirectionService();

export default notificationRedirectionService;