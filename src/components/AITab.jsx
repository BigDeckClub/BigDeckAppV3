/**
 * AI Tab component for BigDeckAI chat interface
 * Allows users to interact with AI for deck building and card analysis
 * @module components/AITab
 */

import React, { useState, useRef, useEffect, memo } from 'react';
import PropTypes from 'prop-types';
import { Send, Bot, User, Trash2, Loader2, Sparkles } from 'lucide-react';
import { useAIChat } from '../hooks/useAIChat';
import { useToast, TOAST_TYPES } from '../context/ToastContext';

/**
 * Chat message component
 */
const ChatMessage = memo(function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-teal-600' : 'bg-purple-600'
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block rounded-lg px-4 py-2 ${
          isUser 
            ? 'bg-teal-600/20 border border-teal-500/30 text-white' 
            : 'bg-slate-700/50 border border-slate-600/30 text-slate-100'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.suggestions.map((suggestion, index) => (
              <span 
                key={index}
                className="inline-block text-xs bg-purple-600/20 text-purple-300 px-2 py-1 rounded border border-purple-500/30"
              >
                {suggestion}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-500 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
});

ChatMessage.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string.isRequired,
    role: PropTypes.oneOf(['user', 'assistant']).isRequired,
    content: PropTypes.string.isRequired,
    suggestions: PropTypes.arrayOf(PropTypes.string),
    timestamp: PropTypes.string.isRequired
  }).isRequired
};

/**
 * Typing indicator component
 */
const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-purple-600">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-slate-700/50 border border-slate-600/30 rounded-lg px-4 py-2">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
});

/**
 * Welcome message component shown when chat is empty
 */
const WelcomeMessage = memo(function WelcomeMessage({ onSuggestionClick }) {
  const suggestions = [
    'Help me build a Commander deck',
    'What are good cards for a burn deck?',
    'Analyze my deck for weaknesses',
    'Suggest budget alternatives'
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-teal-600 flex items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Welcome to BigDeckAI</h2>
      <p className="text-slate-400 max-w-md mb-6">
        Your AI-powered deck building assistant. Ask me about deck building strategies, 
        card recommendations, format legality, or get help analyzing your decklists.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion)}
            className="text-left text-sm bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-teal-500/50 rounded-lg px-4 py-3 text-slate-300 hover:text-white transition-all"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
});

WelcomeMessage.propTypes = {
  onSuggestionClick: PropTypes.func.isRequired
};

/**
 * Main AI Tab component
 */
export function AITab() {
  const {
    messages,
    isLoading,
    isTyping,
    error,
    sendMessage,
    clearConversation,
    clearError
  } = useAIChat();
  
  const { showToast } = useToast();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Show error toast when there's an error
  useEffect(() => {
    if (error) {
      showToast(error, TOAST_TYPES.ERROR);
      clearError();
    }
  }, [error, showToast, clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading || isTyping) {
      return;
    }

    const message = inputValue;
    setInputValue('');

    try {
      await sendMessage(message);
    } catch (err) {
      // Error is already handled by useAIChat and shown via toast
      console.error('[AITab] Send message error:', err);
    }
  };

  const handleClearChat = () => {
    clearConversation();
    showToast('Conversation cleared', TOAST_TYPES.INFO);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestionClick = async (suggestion) => {
    if (isLoading || isTyping) {
      return;
    }

    try {
      await sendMessage(suggestion);
    } catch (err) {
      console.error('[AITab] Suggestion click error:', err);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-teal-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white">BigDeckAI</h2>
            <p className="text-xs text-slate-400">Deck Building Assistant</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-red-400 transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isTyping ? (
          <WelcomeMessage onSuggestionClick={handleSuggestionClick} />
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700 bg-slate-800/30">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask BigDeckAI about deck building..."
            className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400"
            disabled={isLoading || isTyping}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading || isTyping}
            className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
          >
            {isLoading || isTyping ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          BigDeckAI can help with deck building, card recommendations, and strategy advice.
        </p>
      </form>
    </div>
  );
}

export default AITab;
