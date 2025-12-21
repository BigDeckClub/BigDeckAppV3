/**
 * AIChatPanel - Enhanced AI chat interface with better UX
 * @module components/ui/AIChatPanel
 */

import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Send,
  Bot,
  User,
  Trash2,
  Loader2,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  Lightbulb,
} from 'lucide-react';

/**
 * Format timestamp for display
 */
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Copy button with feedback
 */
const CopyButton = memo(function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-muted)] transition-colors"
      title={copied ? 'Copied!' : 'Copy message'}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
});

CopyButton.propTypes = {
  text: PropTypes.string.isRequired,
};

/**
 * Individual chat message
 */
const ChatMessage = memo(function ChatMessage({ message, onRetry }) {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';

  return (
    <div
      className={`
        group flex gap-3 animate-fade-in
        ${isUser ? 'flex-row-reverse' : ''}
      `}
    >
      {/* Avatar */}
      <div
        className={`
          flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center
          ${isUser
            ? 'bg-gradient-to-br from-teal-500 to-cyan-600'
            : 'bg-gradient-to-br from-purple-500 to-indigo-600'
          }
        `}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message content */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`
            inline-block rounded-2xl px-4 py-2.5 text-sm
            ${isUser
              ? 'bg-gradient-to-r from-teal-600/30 to-cyan-600/30 border border-teal-500/30 text-white rounded-br-md'
              : isError
                ? 'bg-red-900/20 border border-red-500/30 text-red-200 rounded-bl-md'
                : 'bg-[var(--surface)] border border-[var(--border)] text-slate-100 rounded-bl-md'
            }
          `}
        >
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>

        {/* Message metadata and actions */}
        <div
          className={`
            flex items-center gap-2 mt-1.5 text-xs text-[var(--text-muted)]
            ${isUser ? 'justify-end' : ''}
            opacity-0 group-hover:opacity-100 transition-opacity
          `}
        >
          <span>{formatTime(message.timestamp)}</span>
          {!isUser && (
            <>
              <CopyButton text={message.content} />
              {isError && onRetry && (
                <button
                  onClick={() => onRetry(message)}
                  className="p-1 text-[var(--text-muted)] hover:text-amber-400 transition-colors"
                  title="Retry"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Suggestions */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.suggestions.map((suggestion, index) => (
              <span
                key={index}
                className="inline-block text-xs bg-purple-600/20 text-purple-300 px-2.5 py-1 rounded-full border border-purple-500/30"
              >
                {suggestion}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

ChatMessage.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string.isRequired,
    role: PropTypes.oneOf(['user', 'assistant']).isRequired,
    content: PropTypes.string.isRequired,
    timestamp: PropTypes.string.isRequired,
    status: PropTypes.string,
    suggestions: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onRetry: PropTypes.func,
};

/**
 * Typing indicator with animated dots
 */
const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-[var(--bda-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-[var(--bda-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-[var(--bda-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
});

/**
 * Suggestion button component
 */
const SuggestionButton = memo(function SuggestionButton({ suggestion, onClick }) {
  return (
    <button
      onClick={() => onClick(suggestion)}
      className="
        group flex items-start gap-3 w-full text-left p-4 rounded-xl
        bg-[var(--surface)] border border-[var(--border)]
        hover:bg-[var(--surface)] hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5
        transition-all duration-200
      "
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
        <Lightbulb className="w-4 h-4 text-accent" />
      </div>
      <span className="text-sm text-[var(--text-muted)] group-hover:text-white transition-colors">
        {suggestion}
      </span>
    </button>
  );
});

SuggestionButton.propTypes = {
  suggestion: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

/**
 * Welcome screen when chat is empty
 */
const WelcomeScreen = memo(function WelcomeScreen({ onSuggestionClick, suggestions }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8">
      {/* Logo */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 via-accent to-teal-500 flex items-center justify-center shadow-lg shadow-accent/20">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-slate-900">
          <Check className="w-3 h-3 text-white" />
        </div>
      </div>

      {/* Title and description */}
      <h2 className="text-2xl font-bold text-white mb-2">Welcome to BigDeckAI</h2>
      <p className="text-[var(--text-muted)] text-center max-w-md mb-8">
        Your AI-powered deck building assistant. Ask about deck strategies,
        card recommendations, format legality, or get help analyzing your collection.
      </p>

      {/* Suggestion grid */}
      <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-3">
        {suggestions.map((suggestion, index) => (
          <SuggestionButton
            key={index}
            suggestion={suggestion}
            onClick={onSuggestionClick}
          />
        ))}
      </div>
    </div>
  );
});

WelcomeScreen.propTypes = {
  onSuggestionClick: PropTypes.func.isRequired,
  suggestions: PropTypes.arrayOf(PropTypes.string).isRequired,
};

/**
 * Scroll to bottom button
 */
const ScrollButton = memo(function ScrollButton({ onClick, visible }) {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className="
        absolute bottom-24 left-1/2 -translate-x-1/2 z-10
        flex items-center gap-1.5 px-3 py-1.5 rounded-full
        bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)]
        hover:bg-[var(--muted-surface)] hover:text-white transition-all
        shadow-lg animate-fade-in
      "
    >
      <ChevronDown className="w-4 h-4" />
      <span className="text-xs font-medium">New messages</span>
    </button>
  );
});

ScrollButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  visible: PropTypes.bool.isRequired,
};

/**
 * Default suggestions
 */
const DEFAULT_SUGGESTIONS = [
  'Help me build a Commander deck',
  'What are good cards for a burn deck?',
  'Analyze my deck for weaknesses',
  'Suggest budget alternatives',
];

/**
 * AIChatPanel - Main chat interface component
 */
export const AIChatPanel = memo(function AIChatPanel({
  messages = [],
  isLoading = false,
  isTyping = false,
  onSendMessage,
  onClearConversation,
  onRetry,
  suggestions = DEFAULT_SUGGESTIONS,
  placeholder = 'Ask BigDeckAI about deck building...',
  title = 'BigDeckAI',
  subtitle = 'Deck Building Assistant',
  className = '',
}) {
  const [inputValue, setInputValue] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // Handle scroll position
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom && messages.length > 0);
  }, [messages.length]);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    const message = inputValue.trim();
    if (!message || isLoading || isTyping) return;

    setInputValue('');
    await onSendMessage?.(message);
    inputRef.current?.focus();
  }, [inputValue, isLoading, isTyping, onSendMessage]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback(async (suggestion) => {
    if (isLoading || isTyping) return;
    await onSendMessage?.(suggestion);
  }, [isLoading, isTyping, onSendMessage]);

  return (
    <div
      className={`
        flex flex-col h-full bg-[var(--bg-page)] rounded-xl border border-[var(--border)] overflow-hidden
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)] backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white">{title}</h2>
            <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={onClearConversation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--text-muted)] hover:text-red-400 hover:bg-red-900/20 transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative"
      >
        {messages.length === 0 && !isTyping ? (
          <WelcomeScreen
            onSuggestionClick={handleSuggestionClick}
            suggestions={suggestions}
          />
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} onRetry={onRetry} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Scroll to bottom button */}
        <ScrollButton onClick={() => scrollToBottom()} visible={showScrollButton} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading || isTyping}
              className="
                w-full bg-[var(--bg-page)] border border-[var(--border)] rounded-xl
                pl-4 pr-12 py-3 text-white placeholder-slate-500
                focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all
              "
            />
            {inputValue && (
              <button
                type="button"
                onClick={() => setInputValue('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-white"
              >
                <span className="sr-only">Clear input</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading || isTyping}
            className="
              flex items-center justify-center w-12 h-12 rounded-xl
              bg-accent hover:bg-accent/90 disabled:bg-[var(--muted-surface)] disabled:cursor-not-allowed
              text-white transition-colors
            "
          >
            {isLoading || isTyping ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-2 text-center">
          Press Enter to send • Shift+Enter for new line
        </p>
      </form>
    </div>
  );
});

AIChatPanel.propTypes = {
  /** Array of chat messages */
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      role: PropTypes.oneOf(['user', 'assistant']).isRequired,
      content: PropTypes.string.isRequired,
      timestamp: PropTypes.string.isRequired,
    })
  ),
  /** Loading state */
  isLoading: PropTypes.bool,
  /** Typing indicator state */
  isTyping: PropTypes.bool,
  /** Callback when user sends a message */
  onSendMessage: PropTypes.func,
  /** Callback to clear conversation */
  onClearConversation: PropTypes.func,
  /** Callback to retry a failed message */
  onRetry: PropTypes.func,
  /** Initial suggestions to show */
  suggestions: PropTypes.arrayOf(PropTypes.string),
  /** Input placeholder text */
  placeholder: PropTypes.string,
  /** Chat title */
  title: PropTypes.string,
  /** Chat subtitle */
  subtitle: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default AIChatPanel;
