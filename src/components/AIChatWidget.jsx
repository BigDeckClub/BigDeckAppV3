/**
 * AIChatWidget - Floating AI chat widget that persists across all tabs
 * A pop-up style chat interface like customer support chat widgets
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Bot, X, Send, Minimize2, Maximize2, Loader2 } from 'lucide-react';
import { useAIChat } from '../hooks/useAIChat';

/**
 * Chat message component
 */
function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2.5 sm:py-2 ${
          isUser
            ? 'bg-teal-600 text-white'
            : 'bg-slate-700 text-slate-100'
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1 text-xs text-teal-400 font-medium">
            <Bot className="w-3 h-3" />
            BigDeckAI
          </div>
        )}
        <p className="text-base sm:text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}

ChatMessage.propTypes = {
  message: PropTypes.shape({
    role: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
  }).isRequired,
};

/**
 * Main floating chat widget component
 */
export function AIChatWidget({ isAuthenticated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearError,
  } = useAIChat();

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isOpen && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;
    
    setInputValue('');
    await sendMessage(trimmed);
  }, [inputValue, isLoading, sendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
    setIsMinimized(false);
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={toggleOpen}
          className="fixed bottom-4 right-4 z-50 w-14 h-14 sm:w-14 sm:h-14 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
          title="Chat with Big Deck Daddy"
        >
          <Bot className="w-7 h-7 group-hover:scale-110 transition-transform" />
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {messages.length}
            </span>
          )}
        </button>
      )}

      {/* Chat Window - Full screen on mobile, floating on desktop */}
      {isOpen && (
        <div
          className={`fixed z-50 bg-slate-800 border border-slate-600 shadow-2xl transition-all duration-300 flex flex-col ${
            isMinimized 
              ? 'bottom-4 right-4 w-72 h-12 rounded-xl' 
              : 'inset-0 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-96 sm:h-[500px] sm:max-h-[80vh] sm:rounded-xl rounded-none'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 sm:py-3 bg-gradient-to-r from-slate-700 to-slate-800 sm:rounded-t-xl border-b border-slate-600 safe-area-top">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-teal-400" />
              <span className="font-semibold text-white">Big Deck Daddy</span>
              <span className="text-xs text-slate-400 hidden sm:inline">MTG Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {/* Only show minimize on desktop */}
              <button
                onClick={toggleMinimize}
                className="hidden sm:block p-1.5 hover:bg-slate-600 rounded-lg transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4 text-slate-300" />
                ) : (
                  <Minimize2 className="w-4 h-4 text-slate-300" />
                )}
              </button>
              <button
                onClick={toggleOpen}
                className="p-1.5 hover:bg-slate-600 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-5 h-5 sm:w-4 sm:h-4 text-slate-300" />
              </button>
            </div>
          </div>

          {/* Chat Content (hidden when minimized) */}
          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-4 space-y-1 overscroll-contain">
                {messages.length === 0 ? (
                  <div className="text-center text-slate-400 py-8 sm:py-8">
                    <Bot className="w-16 h-16 sm:w-12 sm:h-12 mx-auto mb-3 text-teal-500 opacity-50" />
                    <p className="text-base sm:text-sm">Hi! I&apos;m BigDeckAI.</p>
                    <p className="text-sm sm:text-xs mt-1">Ask me about deck building, card analysis, or MTG strategy!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <ChatMessage key={idx} message={msg} />
                  ))
                )}
                
                {isLoading && (
                  <div className="flex justify-start mb-3">
                    <div className="bg-slate-700 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 text-teal-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
                    {error}
                    <button
                      onClick={clearError}
                      className="ml-2 text-red-400 hover:text-red-300 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSubmit} className="p-3 sm:p-3 border-t border-slate-600 safe-area-bottom bg-slate-800">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about deck building..."
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 sm:py-2 text-base sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                    className="px-4 sm:px-3 py-2.5 sm:py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    <Send className="w-5 h-5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}

AIChatWidget.propTypes = {
  isAuthenticated: PropTypes.bool.isRequired,
};

export default AIChatWidget;
