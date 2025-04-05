/**
 * Microsoft Clarity Analytics Utilities
 * Helper functions for Clarity tracking and Identify API
 */

/**
 * Identifies a user in Microsoft Clarity
 * @param userId - Unique identifier for the user (e.g., email, username, UUID)
 * @param sessionId - Optional custom session identifier
 * @param pageId - Optional custom page identifier
 * @param friendlyName - Optional friendly name to display in Clarity dashboard
 * @returns Promise with the identification details
 */
export const identifyClarity = (
  userId: string,
  sessionId?: string,
  pageId?: string,
  friendlyName?: string
): Promise<{
  id: string;
  session?: string;
  page?: string;
  userHint?: string;
}> => {
  if (typeof window !== "undefined" && window.clarity) {
    return window.clarity("identify", userId, sessionId, pageId, friendlyName);
  }

  return Promise.resolve({ id: "" });
};

/**
 * Identifies a page view in Microsoft Clarity
 * @param userId - Unique identifier for the user
 * @param pageId - Identifier for the current page
 * @param friendlyName - Optional friendly name to display in Clarity dashboard
 */
export const identifyPage = (
  userId: string,
  pageId: string,
  friendlyName?: string
): Promise<{
  id: string;
  session?: string;
  page?: string;
  userHint?: string;
}> => {
  return identifyClarity(userId, undefined, pageId, friendlyName);
};

// Add TypeScript declaration for the window.clarity function
declare global {
  interface Window {
    clarity: (
      method: string,
      userId: string,
      sessionId?: string,
      pageId?: string,
      friendlyName?: string
    ) => Promise<{
      id: string;
      session?: string;
      page?: string;
      userHint?: string;
    }>;
  }
}
