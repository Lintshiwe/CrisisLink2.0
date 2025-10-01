// Firebase Integration Service for Real-time Tracking and Notifications
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  GeoPoint,
  writeBatch
} from 'firebase/firestore';
import { 
  getMessaging, 
  getToken, 
  onMessage,
  isSupported 
} from 'firebase/messaging';

class FirebaseTrackingService {
  constructor() {
    this.app = null;
    this.db = null;
    this.messaging = null;
    this.initialized = false;
    this.trackingSubscriptions = new Map();
    this.notificationCallbacks = new Set();
  }

  // Initialize Firebase
  async initialize() {
    if (this.initialized) return;

    try {
      const firebaseConfig = {
        apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
        authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
        storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.REACT_APP_FIREBASE_APP_ID
      };

      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app);

      // Initialize messaging if supported
      if (await isSupported()) {
        this.messaging = getMessaging(this.app);
        await this.setupNotifications();
      }

      this.initialized = true;
      console.log('Firebase Tracking Service initialized');
    } catch (error) {
      console.error('Firebase initialization error:', error);
      throw error;
    }
  }

  // Setup push notifications
  async setupNotifications() {
    if (!this.messaging) return;

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return;
      }

      // Get FCM token
      const token = await getToken(this.messaging, {
        vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
      });

      if (token) {
        console.log('FCM Token:', token);
        
        // Store token for backend use
        localStorage.setItem('fcm_token', token);
        
        // Send token to backend
        await this.registerFCMToken(token);
      }

      // Listen for foreground messages
      onMessage(this.messaging, (payload) => {
        console.log('Foreground message received:', payload);
        this.handleForegroundMessage(payload);
      });

    } catch (error) {
      console.error('Notification setup error:', error);
    }
  }

  // Register FCM token with backend
  async registerFCMToken(token) {
    try {
      const response = await fetch('/api/auth/fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ fcm_token: token })
      });

      if (!response.ok) {
        throw new Error('Failed to register FCM token');
      }
    } catch (error) {
      console.error('FCM token registration error:', error);
    }
  }

  // Handle foreground messages
  handleForegroundMessage(payload) {
    const { notification, data } = payload;
    
    // Create custom notification
    if (notification) {
      const customNotification = new Notification(notification.title, {
        body: notification.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: data?.type || 'emergency',
        data: data,
        requireInteraction: data?.priority === 'high'
      });

      customNotification.onclick = () => {
        window.focus();
        customNotification.close();
        
        // Handle notification click based on type
        if (data?.type === 'agent_assigned') {
          window.location.href = `/sos/${data.sosId}`;
        } else if (data?.type === 'agent_arrived') {
          window.location.href = `/tracking/${data.sosId}`;
        }
      };
    }

    // Call registered callbacks
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        console.error('Notification callback error:', error);
      }
    });
  }

  // Start real-time location tracking for SOS
  async startSOSTracking(sosId, userLocation) {
    if (!this.initialized) await this.initialize();

    try {
      // Create tracking document
      const trackingRef = doc(this.db, 'sos_tracking', sosId.toString());
      
      await setDoc(trackingRef, {
        sosId: sosId,
        status: 'active',
        user_location: new GeoPoint(userLocation.lat, userLocation.lng),
        user_location_accuracy: userLocation.accuracy,
        user_location_timestamp: serverTimestamp(),
        agent_location: null,
        agent_location_timestamp: null,
        route_data: null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // Subscribe to real-time updates
      const unsubscribe = onSnapshot(trackingRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          this.handleTrackingUpdate(sosId, data);
        }
      });

      this.trackingSubscriptions.set(sosId, unsubscribe);
      console.log(`Started Firebase tracking for SOS ${sosId}`);

    } catch (error) {
      console.error('Firebase tracking start error:', error);
      throw error;
    }
  }

  // Update user location in real-time
  async updateUserLocation(sosId, location) {
    if (!this.initialized) await this.initialize();

    try {
      const trackingRef = doc(this.db, 'sos_tracking', sosId.toString());
      
      await setDoc(trackingRef, {
        user_location: new GeoPoint(location.lat, location.lng),
        user_location_accuracy: location.accuracy,
        user_location_timestamp: serverTimestamp(),
        updated_at: serverTimestamp()
      }, { merge: true });

      // Add to location history
      const historyRef = doc(collection(this.db, 'location_history'), 
        `${sosId}_user_${Date.now()}`);
      
      await setDoc(historyRef, {
        sosId: sosId,
        type: 'user',
        location: new GeoPoint(location.lat, location.lng),
        accuracy: location.accuracy,
        timestamp: serverTimestamp()
      });

    } catch (error) {
      console.error('User location update error:', error);
    }
  }

  // Update agent location in real-time
  async updateAgentLocation(sosId, agentId, location, routeData = null) {
    if (!this.initialized) await this.initialize();

    try {
      const batch = writeBatch(this.db);

      // Update main tracking document
      const trackingRef = doc(this.db, 'sos_tracking', sosId.toString());
      batch.set(trackingRef, {
        agent_id: agentId,
        agent_location: new GeoPoint(location.lat, location.lng),
        agent_location_accuracy: location.accuracy,
        agent_location_timestamp: serverTimestamp(),
        route_data: routeData,
        updated_at: serverTimestamp()
      }, { merge: true });

      // Add to location history
      const historyRef = doc(collection(this.db, 'location_history'), 
        `${sosId}_agent_${Date.now()}`);
      batch.set(historyRef, {
        sosId: sosId,
        agentId: agentId,
        type: 'agent',
        location: new GeoPoint(location.lat, location.lng),
        accuracy: location.accuracy,
        speed: location.speed,
        heading: location.heading,
        timestamp: serverTimestamp()
      });

      await batch.commit();

    } catch (error) {
      console.error('Agent location update error:', error);
    }
  }

  // Handle real-time tracking updates
  handleTrackingUpdate(sosId, data) {
    const updateEvent = new CustomEvent('firebase_tracking_update', {
      detail: {
        sosId,
        data: {
          ...data,
          user_location: data.user_location ? {
            lat: data.user_location.latitude,
            lng: data.user_location.longitude
          } : null,
          agent_location: data.agent_location ? {
            lat: data.agent_location.latitude,
            lng: data.agent_location.longitude
          } : null
        }
      }
    });

    window.dispatchEvent(updateEvent);
  }

  // Subscribe to tracking updates
  onTrackingUpdate(callback) {
    const handler = (event) => callback(event.detail);
    window.addEventListener('firebase_tracking_update', handler);
    
    return () => {
      window.removeEventListener('firebase_tracking_update', handler);
    };
  }

  // Subscribe to notifications
  onNotification(callback) {
    this.notificationCallbacks.add(callback);
    
    return () => {
      this.notificationCallbacks.delete(callback);
    };
  }

  // Get location history
  async getLocationHistory(sosId, type = null) {
    if (!this.initialized) await this.initialize();

    try {
      let q = query(
        collection(this.db, 'location_history'),
        where('sosId', '==', sosId),
        orderBy('timestamp', 'desc')
      );

      if (type) {
        q = query(q, where('type', '==', type));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        location: {
          lat: doc.data().location.latitude,
          lng: doc.data().location.longitude
        }
      }));

    } catch (error) {
      console.error('Location history error:', error);
      return [];
    }
  }

  // Stop tracking for SOS
  async stopSOSTracking(sosId) {
    try {
      // Unsubscribe from real-time updates
      const unsubscribe = this.trackingSubscriptions.get(sosId);
      if (unsubscribe) {
        unsubscribe();
        this.trackingSubscriptions.delete(sosId);
      }

      // Update tracking status
      if (this.initialized) {
        const trackingRef = doc(this.db, 'sos_tracking', sosId.toString());
        await setDoc(trackingRef, {
          status: 'completed',
          completed_at: serverTimestamp(),
          updated_at: serverTimestamp()
        }, { merge: true });
      }

      console.log(`Stopped Firebase tracking for SOS ${sosId}`);

    } catch (error) {
      console.error('Firebase tracking stop error:', error);
    }
  }

  // Send emergency notification
  async sendEmergencyNotification(type, data) {
    try {
      const response = await fetch('/api/notifications/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type,
          data,
          fcm_token: localStorage.getItem('fcm_token')
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send emergency notification');
      }

    } catch (error) {
      console.error('Emergency notification error:', error);
    }
  }

  // Clean up
  destroy() {
    // Stop all tracking subscriptions
    this.trackingSubscriptions.forEach(unsubscribe => unsubscribe());
    this.trackingSubscriptions.clear();
    
    // Clear notification callbacks
    this.notificationCallbacks.clear();
    
    this.initialized = false;
  }
}

// Create singleton instance
const firebaseTrackingService = new FirebaseTrackingService();

export default firebaseTrackingService;