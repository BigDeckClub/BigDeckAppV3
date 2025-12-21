import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Layers, Download, BarChart3, BookOpen, TrendingUp, Zap } from 'lucide-react';
import { Modal, Button } from './ui';

const tutorialSteps = [
  {
    title: 'Welcome to BigDeck.app',
    icon: Layers,
    description: 'Your professional Magic: The Gathering inventory management solution',
    details: [
      'Track your entire MTG collection in one place',
      'Manage cards, decks, and sales',
      'Get real-time card pricing and analytics',
      'Organize your cards by folder'
    ]
  },
  {
    title: 'Inventory Tab - Add Cards',
    icon: Layers,
    description: 'Build and organize your card collection',
    details: [
      '1. Search for a card using the search bar',
      '2. Select from the dropdown (results show in real-time)',
      '3. Choose quantity, purchase date, and price',
      '4. Assign to a folder for organization',
      '5. Click "Add Card" to save to your inventory'
    ]
  },
  {
    title: 'Inventory Tab - Manage Cards',
    icon: Layers,
    description: 'Edit and organize your collection',
    details: [
      'Click any card to expand its details',
      'Click the pencil icon to edit quantity, price, or folder',
      'Cards are automatically sorted alphabetically',
      'Use folders to organize by set, rarity, or purpose',
      'Hover over prices to see real-time card values'
    ]
  },
  {
    title: 'Imports Tab - Bulk Add',
    icon: Download,
    description: 'Import cards from decklist text',
    details: [
      'Paste a decklist in standard format:',
      '  4x Black Lotus',
      '  3x Counterspell',
      '  2x Tarmogoyf',
      'Cards are validated against Scryfall database',
      'Import all at once into your inventory'
    ]
  },
  {
    title: 'Analytics Tab - Track Value',
    icon: BarChart3,
    description: 'Visualize your collection performance',
    details: [
      'View total portfolio value in real-time',
      'See spending trends over time',
      'Break down collection by rarity',
      'Track average card price and quantity',
      'Monitor your MTG investment growth'
    ]
  },
  {
    title: 'Decks Tab - Build Decks',
    icon: BookOpen,
    description: 'Create and manage Magic decks',
    details: [
      '1. Create a new deck with a name',
      '2. Add cards from your inventory',
      '3. System reserves specific cards for the deck',
      '4. View deck total value and card count',
      '5. Missing cards are marked - know what to buy',
      '6. Delete decks when no longer needed'
    ]
  },
  {
    title: 'Sales Tab - Track Profit',
    icon: TrendingUp,
    description: 'Record sales and monitor profit',
    details: [
      'Log individual card sales with price',
      'Calculate profit (sell price vs purchase price)',
      'Track deck sales as single transactions',
      'View complete sales history',
      'Monitor ROI on your collection'
    ]
  },
  {
    title: 'Tips & Best Practices',
    icon: Zap,
    description: 'Get the most out of BigDeck',
    details: [
      '💡 Use folders to organize by format (Standard, Modern, Legacy)',
      '💡 Check real-time prices before buying/selling',
      '💡 Review analytics monthly to track portfolio growth',
      '💡 Log all sales to calculate true profit',
      '💡 Import decks before building to track value',
      '💡 Your data is saved automatically'
    ]
  }
];

/**
 * TutorialModal - Step-by-step tutorial for new users
 * Refactored to use shared UI components
 */
export function TutorialModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = tutorialSteps[currentStep];
  const Icon = step.icon;

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Custom header with icon and description
  const customHeader = (
    <div className="flex items-start gap-4 flex-1">
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500/30 to-cyan-500/30 border border-teal-500/50 flex items-center justify-center flex-shrink-0 mt-1">
        <Icon className="w-6 h-6 text-[var(--bda-primary)]" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white">{step.title}</h2>
        <p className="text-[var(--text-muted)] text-sm mt-1">{step.description}</p>
      </div>
    </div>
  );

  // Custom footer with navigation
  const customFooter = (
    <div className="flex items-center justify-between w-full">
      <Button
        variant="ghost"
        onClick={handlePrev}
        disabled={currentStep === 0}
        iconLeft={<ChevronLeft className="w-5 h-5" />}
      >
        Previous
      </Button>

      <div className="flex items-center gap-2">
        <div className="text-sm text-[var(--text-muted)]">
          Step <span className="font-semibold text-white">{currentStep + 1}</span> of <span className="font-semibold text-white">{tutorialSteps.length}</span>
        </div>
        <div className="flex gap-1">
          {tutorialSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`h-2 rounded-full transition ${index === currentStep
                  ? 'bg-[var(--bda-primary)] w-6'
                  : 'bg-[var(--bda-muted)]/30 w-2 hover:bg-[var(--bda-muted)]/50'
                }`}
            />
          ))}
        </div>
      </div>

      <Button
        variant="primary"
        onClick={handleNext}
        disabled={currentStep === tutorialSteps.length - 1}
        iconRight={<ChevronRight className="w-5 h-5" />}
      >
        Next
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customHeader}
      footer={customFooter}
      size="2xl"
    >
      <ul className="space-y-3">
        {step.details.map((detail, index) => (
          <li key={index} className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-[var(--bda-primary)]">{index + 1}</span>
            </div>
            <span className="text-[var(--text-muted)] leading-relaxed">{detail}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
