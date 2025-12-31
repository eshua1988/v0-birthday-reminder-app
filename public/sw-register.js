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
      
      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Check every hour
      
    } catch (error) {
      console.error('[SW] Service Worker registration failed:', error);
    }
  });
  
  // Listen for service worker updates
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[SW] Service Worker controller changed, reloading page');
    window.location.reload();
  });
}
