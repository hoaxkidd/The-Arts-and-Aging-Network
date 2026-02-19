/**
 * Client-side utility to trigger immediate notification refresh.
 * Call this after any action that creates a notification for the current user.
 * NotificationBell and NotificationList listen for this event.
 */
export const NOTIFICATION_REFRESH_EVENT = 'notification-refresh'

export function triggerNotificationRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_REFRESH_EVENT))
  }
}
