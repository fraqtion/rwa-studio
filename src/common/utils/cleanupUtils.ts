/**
 * Utility functions for cleaning up temporary folders
 */

/**
 * Initialize the cleanup event listener
 * This should be called once when the application starts
 */
export function initCleanupListener(): void {
  if (typeof window !== 'undefined') {
    // Listen for the run-cleanup-script event
    window.addEventListener('run-cleanup-script', handleCleanupEvent);

    console.log('Cleanup event listener initialized');
  }
}

/**
 * Handle the cleanup event
 * @param event The custom event with cleanup details
 */
function handleCleanupEvent(event: Event): void {
  const customEvent = event as CustomEvent;
  const folders = customEvent.detail?.folders || ['pkg', 'schema', 'target'];

  console.log('Cleanup event received for folders:', folders);

  // In a browser environment, we can't directly delete folders
  // But we can make an API call to a server-side endpoint

  // For demonstration purposes, we'll just log the action
  console.log(`Would delete folders: ${folders.join(', ')}`);

  // In a real implementation with server access, we would do something like:
  // fetch('/api/cleanup', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ folders })
  // });
}

/**
 * Clean up temporary folders
 * @param folders The folders to clean up
 */
export function cleanupFolders(
  folders: string[] = ['pkg', 'schema', 'target'],
): void {
  console.log(`Cleaning up folders: ${folders.join(', ')}`);

  // Dispatch the cleanup event
  if (typeof window !== 'undefined') {
    const cleanupEvent = new CustomEvent('run-cleanup-script', {
      detail: { folders },
    });
    window.dispatchEvent(cleanupEvent);
  }
}
