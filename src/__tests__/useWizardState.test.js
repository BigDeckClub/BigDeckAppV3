/**
 * Tests for useWizardState hook
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWizardState } from '../hooks/useWizardState';

describe('useWizardState', () => {
  let result;

  beforeEach(() => {
    const hook = renderHook(() => useWizardState());
    result = hook.result;
  });

  describe('Initial State', () => {
    it('should start in idle state', () => {
      expect(result.current.wizardState).toBe('idle');
    });

    it('should have default config values', () => {
      expect(result.current.deckConfig).toEqual({
        commanderMode: null,
        commander: null,
        prompt: '',
        budget: 200,
        source: 'multiverse'
      });
    });

    it('should not be generating', () => {
      expect(result.current.isGenerating).toBe(false);
    });

    it('should not be wizard active', () => {
      expect(result.current.isWizardActive).toBe(false);
    });
  });

  describe('startWizard()', () => {
    it('should transition to step_commander state', () => {
      act(() => {
        result.current.startWizard();
      });

      expect(result.current.wizardState).toBe('step_commander');
      expect(result.current.isWizardActive).toBe(true);
    });
  });

  describe('updateConfig()', () => {
    it('should update a single config field', () => {
      act(() => {
        result.current.updateConfig('budget', 500);
      });

      expect(result.current.deckConfig.budget).toBe(500);
    });

    it('should preserve other config fields', () => {
      act(() => {
        result.current.updateConfig('prompt', 'Build a dragon deck');
      });

      expect(result.current.deckConfig.prompt).toBe('Build a dragon deck');
      expect(result.current.deckConfig.budget).toBe(200); // Unchanged
    });
  });

  describe('updateConfigBatch()', () => {
    it('should update multiple config fields', () => {
      act(() => {
        result.current.updateConfigBatch({
          budget: 300,
          source: 'inventory',
          prompt: 'Tribal elves'
        });
      });

      expect(result.current.deckConfig.budget).toBe(300);
      expect(result.current.deckConfig.source).toBe('inventory');
      expect(result.current.deckConfig.prompt).toBe('Tribal elves');
    });
  });

  describe('selectRandomCommander()', () => {
    it('should set commanderMode to random and go to step_source', () => {
      act(() => {
        result.current.selectRandomCommander();
      });

      expect(result.current.deckConfig.commanderMode).toBe('random');
      expect(result.current.wizardState).toBe('step_source');
    });
  });

  describe('selectSpecificCommander()', () => {
    it('should set commander and go to step_picker_show_card', () => {
      const commander = {
        name: 'Atraxa, Praetors\' Voice',
        id: 'abc123',
        imageUrl: 'https://...'
      };

      act(() => {
        result.current.selectSpecificCommander(commander);
      });

      expect(result.current.deckConfig.commanderMode).toBe('specific');
      expect(result.current.deckConfig.commander).toEqual(commander);
      expect(result.current.wizardState).toBe('step_picker_show_card');
      expect(result.current.showPickerFlipped).toBe(false);
    });
  });

  describe('selectSource()', () => {
    it('should set source and go to step_budget', () => {
      act(() => {
        result.current.selectSource('inventory');
      });

      expect(result.current.deckConfig.source).toBe('inventory');
      expect(result.current.wizardState).toBe('step_budget');
    });
  });

  describe('selectBudget()', () => {
    it('should set budget and go to step_final_input', () => {
      act(() => {
        result.current.selectBudget(1000);
      });

      expect(result.current.deckConfig.budget).toBe(1000);
      expect(result.current.wizardState).toBe('step_final_input');
    });
  });

  describe('startGeneration()', () => {
    it('should transition to generating state', () => {
      act(() => {
        result.current.startGeneration();
      });

      expect(result.current.wizardState).toBe('generating');
      expect(result.current.isGenerating).toBe(true);
    });
  });

  describe('markGenerationReady()', () => {
    it('should transition to ready state', () => {
      act(() => {
        result.current.markGenerationReady();
      });

      expect(result.current.wizardState).toBe('ready');
      expect(result.current.isGenerating).toBe(true);
    });
  });

  describe('handleGenerationError()', () => {
    it('should return to step_final_input', () => {
      act(() => {
        result.current.startGeneration();
      });

      expect(result.current.wizardState).toBe('generating');

      act(() => {
        result.current.handleGenerationError();
      });

      expect(result.current.wizardState).toBe('step_final_input');
    });
  });

  describe('startCracking()', () => {
    it('should transition to cracking then complete', async () => {
      act(() => {
        result.current.startCracking();
      });

      expect(result.current.wizardState).toBe('cracking');

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1300));

      expect(result.current.wizardState).toBe('complete');
    });
  });

  describe('resetWizard()', () => {
    it('should reset to initial state', () => {
      act(() => {
        result.current.startWizard();
        result.current.updateConfig('budget', 999);
        result.current.updateConfig('prompt', 'Test prompt');
      });

      expect(result.current.wizardState).toBe('step_commander');
      expect(result.current.deckConfig.budget).toBe(999);

      act(() => {
        result.current.resetWizard();
      });

      expect(result.current.wizardState).toBe('idle');
      expect(result.current.deckConfig).toEqual({
        commanderMode: null,
        commander: null,
        prompt: '',
        budget: 200,
        source: 'multiverse'
      });
    });
  });

  describe('getStepTitle()', () => {
    it('should return correct title for each step', () => {
      act(() => {
        result.current.goToStep('step_commander');
      });
      expect(result.current.getStepTitle()).toBe('Choose your path');

      act(() => {
        result.current.goToStep('step_source');
      });
      expect(result.current.getStepTitle()).toBe('Choose your source');

      act(() => {
        result.current.goToStep('step_budget');
      });
      expect(result.current.getStepTitle()).toBe('Set your limits');
    });

    it('should return different title for final input based on commander mode', () => {
      act(() => {
        result.current.updateConfig('commanderMode', 'specific');
        result.current.goToStep('step_final_input');
      });
      expect(result.current.getStepTitle()).toBe('Your command?');

      act(() => {
        result.current.updateConfig('commanderMode', 'random');
      });
      expect(result.current.getStepTitle()).toBe('What do you seek?');
    });
  });

  describe('getOrbScale()', () => {
    it('should return 1.0 for idle state', () => {
      expect(result.current.getOrbScale()).toBe(1.0);
    });

    it('should increase scale as wizard progresses', () => {
      act(() => {
        result.current.goToStep('step_commander');
      });
      expect(result.current.getOrbScale()).toBe(1.0);

      act(() => {
        result.current.goToStep('step_source');
      });
      expect(result.current.getOrbScale()).toBe(1.15);

      act(() => {
        result.current.goToStep('step_budget');
      });
      expect(result.current.getOrbScale()).toBe(1.25);

      act(() => {
        result.current.goToStep('step_final_input');
      });
      expect(result.current.getOrbScale()).toBe(1.35);
    });
  });

  describe('goBack()', () => {
    it('should navigate back from step_source to step_commander for random mode', () => {
      act(() => {
        result.current.selectRandomCommander();
      });

      expect(result.current.wizardState).toBe('step_source');

      act(() => {
        result.current.goBack();
      });

      expect(result.current.wizardState).toBe('step_commander');
    });

    it('should navigate back from step_budget to step_source', () => {
      act(() => {
        result.current.goToStep('step_budget');
      });

      act(() => {
        result.current.goBack();
      });

      expect(result.current.wizardState).toBe('step_source');
    });

    it('should navigate back from step_final_input to step_budget', () => {
      act(() => {
        result.current.goToStep('step_final_input');
      });

      act(() => {
        result.current.goBack();
      });

      expect(result.current.wizardState).toBe('step_budget');
    });
  });

  describe('canGoBack', () => {
    it('should be false at step_commander without picker flipped', () => {
      act(() => {
        result.current.goToStep('step_commander');
      });

      expect(result.current.canGoBack).toBe(false);
    });

    it('should be true at step_commander with picker flipped', () => {
      act(() => {
        result.current.goToStep('step_commander');
        result.current.showCommanderPicker();
      });

      expect(result.current.canGoBack).toBe(true);
    });

    it('should be true at other steps', () => {
      act(() => {
        result.current.goToStep('step_source');
      });

      expect(result.current.canGoBack).toBe(true);
    });
  });
});
