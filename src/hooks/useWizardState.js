/**
 * Wizard State Management Hook
 * Manages the multi-step wizard flow for AI deck generation
 */

import { useState, useCallback } from 'react';

const WIZARD_STATES = {
  IDLE: 'idle',
  STEP_COMMANDER: 'step_commander',
  STEP_INPUT: 'step_input',
  STEP_PICKER_SHOW_CARD: 'step_picker_show_card',
  STEP_BUDGET: 'step_budget',
  STEP_SOURCE: 'step_source',
  STEP_FINAL_INPUT: 'step_final_input',
  GENERATING: 'generating',
  READY: 'ready',
  CRACKING: 'cracking',
  COMPLETE: 'complete'
};

const INITIAL_CONFIG = {
  commanderMode: null, // 'random' | 'specific'
  commander: null, // { name, id, imageUrl, ... }
  prompt: '',
  budget: 200,
  source: 'multiverse' // 'multiverse' | 'inventory'
};

/**
 * Hook for managing wizard state machine
 * @returns {Object} Wizard state and control functions
 */
export function useWizardState() {
  // Core wizard state
  const [wizardState, setWizardState] = useState(WIZARD_STATES.IDLE);
  const [deckConfig, setDeckConfig] = useState(INITIAL_CONFIG);

  // Animation states
  const [selectionAnim, setSelectionAnim] = useState(null);
  const [orbAbsorbing, setOrbAbsorbing] = useState(false);
  const [showPickerFlipped, setShowPickerFlipped] = useState(false);

  /**
   * Update a single config field
   */
  const updateConfig = useCallback((key, value) => {
    setDeckConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Update multiple config fields
   */
  const updateConfigBatch = useCallback((updates) => {
    setDeckConfig(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Navigate to a specific step
   */
  const goToStep = useCallback((step) => {
    if (Object.values(WIZARD_STATES).includes(step)) {
      setWizardState(step);
    }
  }, []);

  /**
   * Start the wizard flow
   */
  const startWizard = useCallback(() => {
    setWizardState(WIZARD_STATES.STEP_COMMANDER);
  }, []);

  /**
   * Reset wizard to initial state
   */
  const resetWizard = useCallback(() => {
    setWizardState(WIZARD_STATES.IDLE);
    setDeckConfig(INITIAL_CONFIG);
    setSelectionAnim(null);
    setOrbAbsorbing(false);
    setShowPickerFlipped(false);
  }, []);

  /**
   * Select random commander mode
   */
  const selectRandomCommander = useCallback(() => {
    updateConfig('commanderMode', 'random');
    setWizardState(WIZARD_STATES.STEP_SOURCE);
  }, [updateConfig]);

  /**
   * Select specific commander mode
   */
  const selectSpecificCommander = useCallback((commander) => {
    setDeckConfig(prev => ({
      ...prev,
      commanderMode: 'specific',
      commander
    }));
    setShowPickerFlipped(false);
    setWizardState(WIZARD_STATES.STEP_PICKER_SHOW_CARD);
  }, []);

  /**
   * Show commander picker
   */
  const showCommanderPicker = useCallback(() => {
    setShowPickerFlipped(true);
  }, []);

  /**
   * Hide commander picker
   */
  const hideCommanderPicker = useCallback(() => {
    setShowPickerFlipped(false);
  }, []);

  /**
   * Select deck source (multiverse or inventory)
   */
  const selectSource = useCallback((source) => {
    updateConfig('source', source);
    setWizardState(WIZARD_STATES.STEP_BUDGET);
  }, [updateConfig]);

  /**
   * Select budget option
   */
  const selectBudget = useCallback((budget) => {
    updateConfig('budget', budget);
    setWizardState(WIZARD_STATES.STEP_FINAL_INPUT);
  }, [updateConfig]);

  /**
   * Start deck generation
   */
  const startGeneration = useCallback(() => {
    setWizardState(WIZARD_STATES.GENERATING);
  }, []);

  /**
   * Mark generation as ready (deck generated successfully)
   */
  const markGenerationReady = useCallback(() => {
    setWizardState(WIZARD_STATES.READY);
  }, []);

  /**
   * Handle generation error (return to input step)
   */
  const handleGenerationError = useCallback(() => {
    setWizardState(WIZARD_STATES.STEP_FINAL_INPUT);
  }, []);

  /**
   * Start orb cracking animation
   */
  const startCracking = useCallback(() => {
    setWizardState(WIZARD_STATES.CRACKING);
    setTimeout(() => {
      setWizardState(WIZARD_STATES.COMPLETE);
    }, 1200);
  }, []);

  /**
   * Trigger card selection animation
   */
  const triggerSelectionAnimation = useCallback(async (selectionId, onComplete) => {
    setSelectionAnim(selectionId);

    // Wait for card to reach "Ready to Insert" phase (50% of animation)
    await new Promise(resolve => setTimeout(resolve, 625));

    // Trigger orb absorption as card is being inserted
    setOrbAbsorbing(true);

    // Wait for remaining absorption animation
    await new Promise(resolve => setTimeout(resolve, 625));

    setOrbAbsorbing(false);
    setSelectionAnim(null);
    onComplete?.();
  }, []);

  /**
   * Navigate back one step
   */
  const goBack = useCallback(() => {
    switch (wizardState) {
      case WIZARD_STATES.STEP_SOURCE:
        if (deckConfig.commanderMode === 'specific') {
          setWizardState(WIZARD_STATES.STEP_PICKER_SHOW_CARD);
        } else {
          setWizardState(WIZARD_STATES.STEP_COMMANDER);
        }
        break;
      case WIZARD_STATES.STEP_BUDGET:
        setWizardState(WIZARD_STATES.STEP_SOURCE);
        break;
      case WIZARD_STATES.STEP_FINAL_INPUT:
        setWizardState(WIZARD_STATES.STEP_BUDGET);
        break;
      default:
        if (showPickerFlipped) {
          setShowPickerFlipped(false);
        }
        break;
    }
  }, [wizardState, deckConfig.commanderMode, showPickerFlipped]);

  /**
   * Get step title for current wizard state
   */
  const getStepTitle = useCallback(() => {
    if (selectionAnim) return ''; // Hide title during transition

    switch (wizardState) {
      case WIZARD_STATES.STEP_COMMANDER:
        return 'Choose your path';
      case WIZARD_STATES.STEP_PICKER:
        return 'Summon your legend';
      case WIZARD_STATES.STEP_PICKER_SHOW_CARD:
        return ''; // Hide during card display
      case WIZARD_STATES.STEP_SOURCE:
        return 'Choose your source';
      case WIZARD_STATES.STEP_BUDGET:
        return 'Set your limits';
      case WIZARD_STATES.STEP_FINAL_INPUT:
        return deckConfig.commanderMode === 'specific' ? 'Your command?' : 'What do you seek?';
      default:
        return '';
    }
  }, [wizardState, deckConfig.commanderMode, selectionAnim]);

  /**
   * Get dynamic orb scale based on wizard progress
   */
  const getOrbScale = useCallback(() => {
    const isWizardActive = [
      WIZARD_STATES.STEP_COMMANDER,
      WIZARD_STATES.STEP_PICKER_SHOW_CARD,
      WIZARD_STATES.STEP_SOURCE,
      WIZARD_STATES.STEP_BUDGET,
      WIZARD_STATES.STEP_FINAL_INPUT
    ].includes(wizardState);

    if (!isWizardActive) return 1.0;

    switch (wizardState) {
      case WIZARD_STATES.STEP_COMMANDER:
        return 1.0;
      case WIZARD_STATES.STEP_PICKER_SHOW_CARD:
        return 1.1; // Card selected
      case WIZARD_STATES.STEP_SOURCE:
        return 1.15; // Source selected
      case WIZARD_STATES.STEP_BUDGET:
        return 1.25; // Budget selected
      case WIZARD_STATES.STEP_FINAL_INPUT:
        return 1.35; // Ready to conjure
      default:
        return 1.0;
    }
  }, [wizardState]);

  // Computed states
  const isGenerating = [
    WIZARD_STATES.GENERATING,
    WIZARD_STATES.READY,
    WIZARD_STATES.CRACKING
  ].includes(wizardState);

  const isWizardActive = [
    WIZARD_STATES.STEP_COMMANDER,
    WIZARD_STATES.STEP_PICKER_SHOW_CARD,
    WIZARD_STATES.STEP_SOURCE,
    WIZARD_STATES.STEP_BUDGET,
    WIZARD_STATES.STEP_FINAL_INPUT
  ].includes(wizardState);

  const canGoBack = wizardState !== WIZARD_STATES.STEP_COMMANDER || showPickerFlipped;

  return {
    // State
    wizardState,
    deckConfig,
    selectionAnim,
    orbAbsorbing,
    showPickerFlipped,

    // Config updates
    updateConfig,
    updateConfigBatch,

    // Navigation
    goToStep,
    goBack,
    startWizard,
    resetWizard,

    // Commander selection
    selectRandomCommander,
    selectSpecificCommander,
    showCommanderPicker,
    hideCommanderPicker,

    // Wizard steps
    selectSource,
    selectBudget,
    startGeneration,
    markGenerationReady,
    handleGenerationError,
    startCracking,

    // Animation
    triggerSelectionAnimation,

    // Helpers
    getStepTitle,
    getOrbScale,

    // Computed
    isGenerating,
    isWizardActive,
    canGoBack,

    // Constants export
    WIZARD_STATES
  };
}
