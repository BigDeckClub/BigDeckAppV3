import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AITab } from '../components/AITab';
import { ToastProvider } from '../context/ToastContext';
import { ToastContainer } from '../components/ToastContainer';

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn();

// Mock the useAIChat hook
const mockSendMessage = vi.fn();
const mockClearConversation = vi.fn();
const mockClearError = vi.fn();

vi.mock('../hooks/useAIChat', () => ({
  useAIChat: () => ({
    messages: mockMessages,
    isLoading: mockIsLoading,
    isTyping: mockIsTyping,
    error: mockError,
    sendMessage: mockSendMessage,
    clearConversation: mockClearConversation,
    clearError: mockClearError
  })
}));

// Mock state variables
let mockMessages = [];
let mockIsLoading = false;
let mockIsTyping = false;
let mockError = null;

// Helper to render with providers
const renderWithProviders = (ui) => {
  return render(
    <ToastProvider>
      {ui}
      <ToastContainer />
    </ToastProvider>
  );
};

describe('AITab Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMessages = [];
    mockIsLoading = false;
    mockIsTyping = false;
    mockError = null;
  });

  describe('Rendering', () => {
    it('should render the welcome screen when there are no messages', () => {
      renderWithProviders(<AITab />);
      
      expect(screen.getByText('Welcome to BigDeckAI')).toBeInTheDocument();
      expect(screen.getByText(/AI-powered deck building assistant/)).toBeInTheDocument();
    });

    it('should render the header with BigDeckAI title', () => {
      renderWithProviders(<AITab />);
      
      expect(screen.getByText('BigDeckAI')).toBeInTheDocument();
      expect(screen.getByText('Deck Building Assistant')).toBeInTheDocument();
    });

    it('should render the message input form', () => {
      renderWithProviders(<AITab />);
      
      expect(screen.getByPlaceholderText('Ask BigDeckAI about deck building...')).toBeInTheDocument();
    });

    it('should render suggestion buttons in welcome screen', () => {
      renderWithProviders(<AITab />);
      
      expect(screen.getByText('Help me build a Commander deck')).toBeInTheDocument();
      expect(screen.getByText('What are good cards for a burn deck?')).toBeInTheDocument();
      expect(screen.getByText('Analyze my deck for weaknesses')).toBeInTheDocument();
      expect(screen.getByText('Suggest budget alternatives')).toBeInTheDocument();
    });
  });

  describe('Message Input', () => {
    it('should have a disabled submit button when input is empty', () => {
      renderWithProviders(<AITab />);
      
      const submitButton = screen.getByRole('button', { name: '' });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when input has text', () => {
      renderWithProviders(<AITab />);
      
      const input = screen.getByPlaceholderText('Ask BigDeckAI about deck building...');
      fireEvent.change(input, { target: { value: 'Hello AI' } });
      
      // The submit button should be enabled
      const buttons = screen.getAllByRole('button');
      const submitButton = buttons.find(btn => btn.type === 'submit');
      expect(submitButton).not.toBeDisabled();
    });

    it('should call sendMessage when form is submitted', async () => {
      mockSendMessage.mockResolvedValue({});
      renderWithProviders(<AITab />);
      
      const input = screen.getByPlaceholderText('Ask BigDeckAI about deck building...');
      fireEvent.change(input, { target: { value: 'Hello AI' } });
      
      const form = input.closest('form');
      fireEvent.submit(form);
      
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('Hello AI');
      });
    });

    it('should clear input after sending message', async () => {
      mockSendMessage.mockResolvedValue({});
      renderWithProviders(<AITab />);
      
      const input = screen.getByPlaceholderText('Ask BigDeckAI about deck building...');
      fireEvent.change(input, { target: { value: 'Hello AI' } });
      fireEvent.submit(input.closest('form'));
      
      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });
  });

  describe('Suggestion Clicks', () => {
    it('should call sendMessage when suggestion button is clicked', async () => {
      mockSendMessage.mockResolvedValue({});
      renderWithProviders(<AITab />);
      
      const suggestionButton = screen.getByText('Help me build a Commander deck');
      fireEvent.click(suggestionButton);
      
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('Help me build a Commander deck');
      });
    });
  });

  describe('Typing Indicator', () => {
    it('should show typing indicator when isTyping is true', () => {
      mockIsTyping = true;
      mockMessages = [
        { id: '1', role: 'user', content: 'Hello', timestamp: new Date().toISOString() }
      ];
      renderWithProviders(<AITab />);
      
      // Check for bouncing animation elements (typing indicator)
      const bouncingElements = document.querySelectorAll('.animate-bounce');
      expect(bouncingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Clear Conversation', () => {
    it('should not show clear button when there are no messages', () => {
      mockMessages = [];
      renderWithProviders(<AITab />);
      
      expect(screen.queryByTitle('Clear conversation')).not.toBeInTheDocument();
    });

    it('should show clear button when there are messages', () => {
      mockMessages = [
        { id: '1', role: 'user', content: 'Hello', timestamp: new Date().toISOString() }
      ];
      renderWithProviders(<AITab />);
      
      expect(screen.getByTitle('Clear conversation')).toBeInTheDocument();
    });

    it('should call clearConversation when clear button is clicked', () => {
      mockMessages = [
        { id: '1', role: 'user', content: 'Hello', timestamp: new Date().toISOString() }
      ];
      renderWithProviders(<AITab />);
      
      const clearButton = screen.getByTitle('Clear conversation');
      fireEvent.click(clearButton);
      
      expect(mockClearConversation).toHaveBeenCalled();
    });
  });

  describe('Message Display', () => {
    it('should display user messages', () => {
      mockMessages = [
        { id: '1', role: 'user', content: 'Hello AI', timestamp: new Date().toISOString() }
      ];
      renderWithProviders(<AITab />);
      
      expect(screen.getByText('Hello AI')).toBeInTheDocument();
    });

    it('should display assistant messages', () => {
      mockMessages = [
        { id: '1', role: 'assistant', content: 'Hello! How can I help?', timestamp: new Date().toISOString() }
      ];
      renderWithProviders(<AITab />);
      
      expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument();
    });

    it('should display suggestions in assistant messages', () => {
      mockMessages = [
        { 
          id: '1', 
          role: 'assistant', 
          content: 'Here are some options:', 
          suggestions: ['Option 1', 'Option 2'],
          timestamp: new Date().toISOString() 
        }
      ];
      renderWithProviders(<AITab />);
      
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should disable input when loading', () => {
      mockIsLoading = true;
      renderWithProviders(<AITab />);
      
      const input = screen.getByPlaceholderText('Ask BigDeckAI about deck building...');
      expect(input).toBeDisabled();
    });

    it('should disable input when typing', () => {
      mockIsTyping = true;
      renderWithProviders(<AITab />);
      
      const input = screen.getByPlaceholderText('Ask BigDeckAI about deck building...');
      expect(input).toBeDisabled();
    });
  });
});
