// Service Worker for CrisisLink - Handles background notifications and offline functionality
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDRMaid3NqgUE-mgyGpooyCPSqE_3YeJB8",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Handle background messages
onBackgroundMessage(messaging, (payload) => {
  console.log('Background message received:', payload);

  const { notification, data } = payload;
  
  // Enhanced notification options based on emergency type
  const notificationOptions = {
    body: notification.body,
    icon: getNotificationIcon(data.type),
    badge: '/icons/badge-72x72.png',
    tag: data.type,
    data: data,
    requireInteraction: data.priority === 'high',
    silent: false,
    vibrate: getVibrationPattern(data.type),
    actions: getNotificationActions(data.type),
    timestamp: Date.now()
  };

  // Add sound for high priority notifications
  if (data.priority === 'high') {
    notificationOptions.sound = '/sounds/emergency-alert.mp3';
  }

  // Show notification
  self.registration.showNotification(notification.title, notificationOptions);
});

// Get notification icon based on type
function getNotificationIcon(type) {
  const icons = {
    'sos_alert': '/icons/emergency-192.png',
    'agent_assigned': '/icons/agent-192.png',
    'agent_arrived': '/icons/arrived-192.png',
    'weather_alert': '/icons/weather-192.png',
    'route_redirect': '/icons/redirect-192.png',
    'system_alert': '/icons/system-192.png'
  };
  
  return icons[type] || '/icons/icon-192x192.png';
}

// Get vibration pattern based on notification type
function getVibrationPattern(type) {
  const patterns = {
    'sos_alert': [300, 100, 300, 100, 300], // Urgent
    'agent_assigned': [200, 100, 200], // Important
    'agent_arrived': [100, 50, 100, 50, 100], // Success
    'weather_alert': [250, 150, 250], // Warning
    'route_redirect': [150, 100, 150], // Info
    'system_alert': [100, 100, 100] // Standard
  };
  
  return patterns[type] || [200, 100, 200];
}

// Get notification actions based on type
function getNotificationActions(type) {
  const actions = {
    'sos_alert': [
      { action: 'view_status', title: 'View Status', icon: '/icons/view-action.png' },
      { action: 'call_emergency', title: 'Call 911', icon: '/icons/call-action.png' }
    ],
    'agent_assigned': [
      { action: 'track_agent', title: 'Track Agent', icon: '/icons/track-action.png' },
      { action: 'send_message', title: 'Message', icon: '/icons/message-action.png' }
    ],
    'agent_arrived': [
      { action: 'open_communication', title: 'Communicate', icon: '/icons/comm-action.png' },
      { action: 'confirm_arrival', title: 'Confirm', icon: '/icons/confirm-action.png' }
    ],
    'weather_alert': [
      { action: 'view_details', title: 'View Details', icon: '/icons/details-action.png' },
      { action: 'dismiss_alert', title: 'Dismiss', icon: '/icons/dismiss-action.png' }
    ],
    'route_redirect': [
      { action: 'accept_route', title: 'Accept Route', icon: '/icons/accept-action.png' },
      { action: 'decline_route', title: 'Keep Current', icon: '/icons/decline-action.png' }
    ]
  };
  
  return actions[type] || [
    { action: 'view', title: 'View', icon: '/icons/view-action.png' }
  ];
}

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);

  const { action, notification } = event;
  const data = notification.data;

  event.notification.close();

  // Handle different actions
  const actionHandlers = {
    // SOS Alert Actions
    'view_status': () => openWindow(`/sos/${data.sosId}`),
    'call_emergency': () => makeEmergencyCall(),
    
    // Agent Actions
    'track_agent': () => openWindow(`/tracking/${data.sosId}`),
    'send_message': () => openWindow(`/communication/${data.sosId}?action=message`),
    
    // Agent Arrival Actions
    'open_communication': () => openWindow(`/communication/${data.sosId}`),
    'confirm_arrival': () => confirmAgentArrival(data.sosId),
    
    // Weather Alert Actions
    'view_details': () => openWindow(`/weather/alert/${data.alertId}`),
    'dismiss_alert': () => dismissWeatherAlert(data.alertId),
    
    // Route Redirection Actions
    'accept_route': () => acceptRouteRedirection(data),
    'decline_route': () => declineRouteRedirection(data),
    
    // Default action (click without specific action)
    'default': () => handleDefaultClick(data)
  };

  const handler = actionHandlers[action] || actionHandlers['default'];
  
  event.waitUntil(handler());
});

// Open window or focus existing one
async function openWindow(url) {
  const fullUrl = self.location.origin + url;
  
  try {
    // Check if there's already a window open
    const windowClients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    // Focus existing window if found
    for (const client of windowClients) {
      if (client.url.includes(url.split('?')[0])) {
        await client.focus();
        client.navigate(fullUrl);
        return;
      }
    }

    // Open new window
    await self.clients.openWindow(fullUrl);
    
  } catch (error) {
    console.error('Error opening window:', error);
  }
}

// Make emergency call
async function makeEmergencyCall() {
  try {
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'EMERGENCY_CALL',
        action: 'call_911'
      });
    }
  } catch (error) {
    console.error('Emergency call error:', error);
  }
}

// Confirm agent arrival
async function confirmAgentArrival(sosId) {
  try {
    const response = await fetch(`/api/sos/${sosId}/confirm-arrival`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getStoredToken()}`
      }
    });

    if (response.ok) {
      // Show success notification
      self.registration.showNotification('Arrival Confirmed', {
        body: 'Agent arrival has been confirmed',
        icon: '/icons/success-192.png',
        tag: 'arrival_confirmed'
      });
    }
  } catch (error) {
    console.error('Confirm arrival error:', error);
  }
}

// Dismiss weather alert
async function dismissWeatherAlert(alertId) {
  try {
    const response = await fetch(`/api/weather/alerts/${alertId}/dismiss`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getStoredToken()}`
      }
    });

    if (response.ok) {
      // Notify clients
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'WEATHER_ALERT_DISMISSED',
          alertId: alertId
        });
      });
    }
  } catch (error) {
    console.error('Dismiss weather alert error:', error);
  }
}

// Accept route redirection
async function acceptRouteRedirection(data) {
  try {
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'ROUTE_REDIRECTION_ACCEPTED',
        data: data
      });
    }
  } catch (error) {
    console.error('Accept route redirection error:', error);
  }
}

// Decline route redirection
async function declineRouteRedirection(data) {
  try {
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'ROUTE_REDIRECTION_DECLINED',
        data: data
      });
    }
  } catch (error) {
    console.error('Decline route redirection error:', error);
  }
}

// Handle default notification click
function handleDefaultClick(data) {
  const defaultRoutes = {
    'sos_alert': `/sos/${data.sosId}`,
    'agent_assigned': `/tracking/${data.sosId}`,
    'agent_arrived': `/communication/${data.sosId}`,
    'weather_alert': `/weather/alert/${data.alertId}`,
    'route_redirect': `/navigation`,
    'system_alert': '/dashboard'
  };

  const route = defaultRoutes[data.type] || '/';
  return openWindow(route);
}

// Get stored authentication token
async function getStoredToken() {
  try {
    // Try to get token from IndexedDB or localStorage via client
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          resolve(event.data.token);
        };
        
        clients[0].postMessage({
          type: 'GET_AUTH_TOKEN'
        }, [channel.port2]);
      });
    }
    return null;
  } catch (error) {
    console.error('Error getting stored token:', error);
    return null;
  }
}

// Handle periodic background sync for emergency status
self.addEventListener('sync', (event) => {
  if (event.tag === 'emergency-status-sync') {
    event.waitUntil(syncEmergencyStatus());
  }
});

// Sync emergency status in background
async function syncEmergencyStatus() {
  try {
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'SYNC_EMERGENCY_STATUS'
      });
    }
  } catch (error) {
    console.error('Emergency status sync error:', error);
  }
}

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription change:', event);
  
  event.waitUntil(
    updatePushSubscription()
  );
});

// Update push subscription
async function updatePushSubscription() {
  try {
    const subscription = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
    });

    // Send new subscription to server
    const response = await fetch('/api/auth/update-push-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getStoredToken()}`
      },
      body: JSON.stringify({
        subscription: subscription.toJSON()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update push subscription');
    }

  } catch (error) {
    console.error('Update push subscription error:', error);
  }
}

// Cache management for offline functionality
const CACHE_NAME = 'crisislink-v1';
const ESSENTIAL_URLS = [
  '/',
  '/sos',
  '/tracking',
  '/communication',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ESSENTIAL_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => 
        Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cache the response
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/offline');
            }
          });
      })
  );
});

console.log('CrisisLink Service Worker loaded');