import { useState, useCallback, useRef } from 'react';
import { useApi } from './useApi';

/**
 * Generate a unique ID for messages
 * @returns {string} A unique identifier
 */
function generateMessageId() {
  // Use a combination of timestamp and random string for uniqueness
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Custom hook for managing AI chat interactions
 * @returns {Object} Chat state and methods
 */
export function useAIChat() {
  const { post, get, isLoading, error, clearError } = useApi();
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const abortControllerRef = useRef(null);

  /**
   * Send a message to the AI and get a response
   * @param {string} message - The user's message
   * @returns {Promise<Object>} The AI response
   */
  const sendMessage = useCallback(async (message) => {
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return null;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Add user message to the conversation
    const userMessage = {
      id: generateMessageId(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await post('/ai/chat', {
        message: message.trim(),
        conversationHistory
      }, { signal: abortControllerRef.current.signal });

      // Add AI response to the conversation
      const aiMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: response.response,
        suggestions: response.suggestions || [],
        timestamp: response.timestamp || new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
      return response;
    } catch (err) {
      // Don't set error if request was aborted
      if (err.name === 'AbortError') {
        return null;
      }
      throw err;
    } finally {
      setIsTyping(false);
    }
  }, [messages, post]);

  /**
   * Clear the conversation history
   */
  const clearConversation = useCallback(() => {
    setMessages([]);
    clearError();
  }, [clearError]);

  /**
   * Check the AI service status
   * @returns {Promise<Object>} The service status
   */
  const checkStatus = useCallback(async () => {
    try {
      const status = await get('/ai/status');
      return status;
    } catch (err) {
      console.error('[AI] Status check failed:', err);
      return { available: false };
    }
  }, [get]);

  /**
   * Cancel any in-flight request
   */
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTyping(false);
  }, []);

  return {
    messages,
    isLoading,
    isTyping,
    error,
    sendMessage,
    clearConversation,
    checkStatus,
    cancelRequest,
    clearError
  };
}

export default useAIChat;
