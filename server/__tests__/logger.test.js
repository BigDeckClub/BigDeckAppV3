/**
 * Tests for Logger utility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger } from '../utils/logger.js';

describe('Logger', () => {
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('error()', () => {
    it('should log error messages', () => {
      logger.error('Test error');
      expect(consoleErrorSpy).toHaveBeenCalled();
      const logMessage = consoleErrorSpy.mock.calls[0][0];
      expect(logMessage).toContain('ERROR');
      expect(logMessage).toContain('Test error');
    });

    it('should include metadata', () => {
      logger.error('Test error', { code: 500 });
      const logMessage = consoleErrorSpy.mock.calls[0][0];
      expect(logMessage).toContain('code');
      expect(logMessage).toContain('500');
    });
  });

  describe('warn()', () => {
    it('should log warning messages', () => {
      logger.warn('Test warning');
      expect(consoleWarnSpy).toHaveBeenCalled();
      const logMessage = consoleWarnSpy.mock.calls[0][0];
      expect(logMessage).toContain('WARN');
      expect(logMessage).toContain('Test warning');
    });
  });

  describe('info()', () => {
    it('should log info messages', () => {
      logger.info('Test info');
      expect(consoleLogSpy).toHaveBeenCalled();
      const logMessage = consoleLogSpy.mock.calls[0][0];
      expect(logMessage).toContain('INFO');
      expect(logMessage).toContain('Test info');
    });
  });

  describe('debug()', () => {
    it('should log debug messages in development', () => {
      logger.debug('Test debug');
      expect(consoleLogSpy).toHaveBeenCalled();
      const logMessage = consoleLogSpy.mock.calls[0][0];
      expect(logMessage).toContain('DEBUG');
      expect(logMessage).toContain('Test debug');
    });
  });

  describe('request()', () => {
    it('should log HTTP requests', () => {
      logger.request('GET', '/api/decks');
      expect(consoleLogSpy).toHaveBeenCalled();
      const logMessage = consoleLogSpy.mock.calls[0][0];
      expect(logMessage).toContain('GET');
      expect(logMessage).toContain('/api/decks');
    });
  });

  describe('response()', () => {
    it('should log HTTP responses', () => {
      logger.response('POST', '/api/decks', 201, 150);
      expect(consoleLogSpy).toHaveBeenCalled();
      const logMessage = consoleLogSpy.mock.calls[0][0];
      expect(logMessage).toContain('POST');
      expect(logMessage).toContain('/api/decks');
      expect(logMessage).toContain('201');
      expect(logMessage).toContain('150ms');
    });
  });

  describe('format()', () => {
    it('should include timestamp', () => {
      logger.info('Test message');
      const logMessage = consoleLogSpy.mock.calls[0][0];
      // Check for ISO timestamp pattern (YYYY-MM-DD)
      expect(logMessage).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('should include log level', () => {
      logger.info('Test message');
      const logMessage = consoleLogSpy.mock.calls[0][0];
      expect(logMessage).toContain('[INFO]');
    });
  });
});
