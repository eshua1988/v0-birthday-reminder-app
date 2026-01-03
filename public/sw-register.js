// Service Worker Registration Script
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Register Firebase Messaging Service Worker from API endpoint with real config
      const registration = await navigator.serviceWorker.register('/api/firebase-messaging-sw', {
        scope: '/'
      });
      
      console.log('[SW] Firebase Messaging Service Worker registered:', registration.scope);
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('[SW] Service Worker is ready');
      
      // Check for updates every 6 hours (not more often to avoid reload loops)
      setInterval(() => {
        registration.update();
      }, 6 * 60 * 60 * 1000);
      
    } catch (error) {
      console.error('[SW] Service Worker registration failed:', error);
    }
  });
  
  // Don't auto-reload on controller change - this causes reload loops
  // User can manually refresh if needed
}
