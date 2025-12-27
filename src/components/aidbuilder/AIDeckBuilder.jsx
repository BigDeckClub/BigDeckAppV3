import React, { useState, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useOrbAnimation } from '../../context/OrbAnimationContext';
import { useApi } from '../../hooks/useApi';
import { useToast, TOAST_TYPES } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Input, Alert } from '../ui';
import { Sparkles, Save, Search, RefreshCw, Check, ShoppingCart, Dices, Wallet, Lock, Layers } from 'lucide-react';
import { TCGPlayerBrandIcon, CardKingdomBrandIcon } from '../icons/VendorIcons';
import { BuyCardsModal } from '../buy/BuyCardsModal';
import CommanderPicker from './CommanderPicker';
import OrbDropdown from './OrbDropdown';
import Card from '../ui/Card';
import Button from '../ui/Button';
import MysticOrb from '../ui/MysticOrb';
import WizardOptionCard from './WizardOptionCard';
import { ChevronLeft } from 'lucide-react';

const LOADING_STEPS = [
    { step: 0, msg: 'Identifying Commander...', icon: '🔮' },
    { step: 1, msg: 'Fetching EDHREC data...', icon: '📊' },
    { step: 2, msg: 'Analyzing MTGGoldfish decks...', icon: '🐟' },
    { step: 3, msg: 'Pondering Orbs...', icon: '🔮' },
    { step: 4, msg: 'Building synergies...', icon: '⚡' },
    { step: 5, msg: 'Optimizing mana curve...', icon: '📈' },
    { step: 6, msg: 'Finalizing deck...', icon: '✨' },
];

export default function AIDeckBuilder({ onComplete, isGuest = false, onAuthSuccess }) {
    const { login, signup } = useAuth();
    const { post, put } = useApi();
    const { inventory } = useInventory();
    const { showToast } = useToast();

    const [wizardState, setWizardState] = useState('idle'); // 'idle' | 'step_commander' | 'step_input' | 'step_picker_show_card' | 'step_budget' | 'step_source' | 'generating' | 'ready' | 'cracking' | 'complete'
    const [selectionAnim, setSelectionAnim] = useState(null); // { id: string, type: 'absorb' }
    const [orbAbsorbing, setOrbAbsorbing] = useState(false);
    const [showPickerFlipped, setShowPickerFlipped] = useState(false);

    // Wizard Configuration State
    const [deckConfig, setDeckConfig] = useState({
        commanderMode: null, // 'random' | 'specific'
        commander: null, // { name, ... } if specific
        prompt: '',
        budget: 200,
        source: 'multiverse' // 'multiverse' | 'inventory'
    });

    const [loadingStep, setLoadingStep] = useState(0);
    const [result, setResult] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const [activeMobileTab, setActiveMobileTab] = useState('deck');
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showBuyModal, setShowBuyModal] = useState(false);

    // Auth State for Guest Mode
    const [authMode, setAuthMode] = useState('signup'); // 'login' | 'signup'
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [shouldAutoGenerate, setShouldAutoGenerate] = useState(false);

    // Restore state from session if post-auth
    useEffect(() => {
        const pendingConfig = sessionStorage.getItem('pending_deck_config');
        if (pendingConfig && !isGuest) {
            try {
                const config = JSON.parse(pendingConfig);
                setDeckConfig(config);
                sessionStorage.removeItem('pending_deck_config');
                setShouldAutoGenerate(true);
            } catch (e) {
                console.error("Failed to restore config", e);
            }
        }
    }, [isGuest]);

    useEffect(() => {
        if (shouldAutoGenerate) {
            setShouldAutoGenerate(false);
            handleGenerate();
        }
    }, [shouldAutoGenerate, deckConfig]);

    // Legacy state for CommanderPicker refactoring compatibility (temporary)
    const [showCommanderPicker, setShowCommanderPicker] = useState(false);
    const [selectedCommander, setSelectedCommander] = useState(null);

    // Update loading effect to track wizardState
    useEffect(() => {
        if (wizardState !== 'generating') {
            setLoadingStep(0);
            return;
        }
        const interval = setInterval(() => {
            setLoadingStep(prev => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
        }, 2500);
        return () => clearInterval(interval);
    }, [wizardState]);

    // Handle deck generation
    const handleGenerate = async () => {
        if (isGuest) {
            handleWizardSelection('final_input', () => {
                setWizardState('step_auth');
            });
            return;
        }

        setWizardState('generating');
        setResult(null);

        try {
            const data = await post('/ai/generate', {
                commanderMode: deckConfig.commanderMode, // 'random' or 'specific'
                commander: deckConfig.commanderMode === 'specific' ? deckConfig.commander?.name : null,
                theme: deckConfig.prompt,
                budget: deckConfig.budget === 'Unlimited' ? null : deckConfig.budget,
                bracket: 3,
                inventoryOnly: deckConfig.source === 'inventory'
            });

            setResult(data);
            setWizardState('ready');
        } catch (error) {
            console.error('Generation failed', error);

            // Check for specific error types
            if (error.data?.requiredCount && error.data?.availableCount) {
                // Inventory-only mode doesn't have enough cards
                showToast(
                    `Need at least ${error.data.requiredCount} available cards for inventory-only mode. You have ${error.data.availableCount}.`,
                    TOAST_TYPES.ERROR
                );
            } else if (error.message) {
                showToast(error.message, TOAST_TYPES.ERROR);
            } else {
                showToast('Failed to generate deck. Please try again.', TOAST_TYPES.ERROR);
            }

            setWizardState('step_final_input'); // Go back to input step on error
        }
    };

    // Wizard Navigation Helpers
    const updateConfig = (key, value) => {
        setDeckConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleOrbCrack = () => {
        setWizardState('cracking');
        setTimeout(() => {
            setWizardState('complete');
        }, 1200);
    };

    const handleGuestAuth = async (e) => {
        e.preventDefault();
        setAuthError('');
        setAuthLoading(true);
        try {
            if (authMode === 'signup') {
                await signup(authEmail, authPassword);
            } else {
                await login(authEmail, authPassword);
            }
            // Save config to session storage
            sessionStorage.setItem('pending_deck_config', JSON.stringify(deckConfig));

            if (onAuthSuccess) onAuthSuccess();
        } catch (err) {
            setAuthError(err.message || 'Authentication failed');
        } finally {
            setAuthLoading(false);
        }
    };

    // Auto-trigger commander card insertion after brief display
    useEffect(() => {
        if (wizardState === 'step_picker_show_card') {
            const timer = setTimeout(async () => {
                // Trigger insertion animation
                await handleWizardSelection('commander-card', () => {
                    setWizardState('step_source');
                    setShowPickerFlipped(false); // Reset for next time
                });
            }, 800); // Show card for 800ms before inserting
            return () => clearTimeout(timer);
        }
    }, [wizardState]);

    const handleNewDeck = () => {
        setResult(null);
        setDeckConfig({
            commanderMode: null,
            commander: null,
            prompt: '',
            budget: 200,
            source: 'multiverse'
        });
        setWizardState('idle');
    };

    // Legacy support for helper function
    const inventoryOnly = deckConfig.source === 'inventory';

    // Helper to check ownership and availability
    const checkOwnership = (cardName) => {
        const found = inventory.find(c => c.name.toLowerCase() === cardName.toLowerCase());
        if (!found) return { total: 0, reserved: 0, available: 0 };

        const total = parseInt(found.quantity) || 0;
        const reserved = parseInt(found.reserved_quantity) || 0;
        const available = total - reserved;

        return { total, reserved, available };
    };

    // Calculate available cards for inventory-only mode warning
    const availableCount = inventory.filter(c => {
        const total = parseInt(c.quantity) || 0;
        const reserved = parseInt(c.reserved_quantity) || 0;
        return (total - reserved) > 0;
    }).length;

    // Calculate total value of available inventory
    const availableInventoryValue = inventory.reduce((total, card) => {
        const qty = parseInt(card.quantity) || 0;
        const reserved = parseInt(card.reserved_quantity) || 0;
        const available = qty - reserved;
        const price = parseFloat(card.purchase_price) || 0;
        return total + (available * price);
    }, 0);

    // Handle "Use Inventory Value" button
    const handleUseInventoryValue = () => {
        const roundedValue = Math.round(availableInventoryValue / 10) * 10; // Round to nearest $10
        setBudget(Math.max(50, Math.min(2000, roundedValue))); // Clamp between $50-$2000
        setUseBudget(true);
    };

    // Get unavailable cards (missing + reserved) for buy modal
    const getUnavailableCards = () => {
        if (!result) return [];

        return result.deck.cards.filter(card => {
            const { available } = checkOwnership(card.name);
            const neededQty = card.quantity || 1;
            return available < neededQty;
        }).map(card => {
            const { available } = checkOwnership(card.name);
            const neededQty = card.quantity || 1;
            return {
                name: card.name,
                quantity: neededQty - available
            };
        });
    };

    const handleSaveDeck = async () => {
        if (!result) return;

        try {
            // 1. Create Empty Deck
            const deckName = `${result.commander.name} - Orb Deck`;
            const newDeck = await post('/decks', {
                name: deckName,
                commanderId: result.commander.id, // Scryfall ID
                commanderName: result.commander.name,
                format: 'commander'
            });

            // 2. Add Cards to Deck
            const cardList = result.deck.cards.map(c => ({
                name: c.name,
                quantity: c.quantity || 1, // Ensure quantity is passed
                isBooster: false, // Default flags
                category: c.category
            }));

            await put(`/decks/${newDeck.id}`, {
                ...newDeck,
                cards: cardList
            });

            showToast(`Deck "${deckName}" saved successfully!`, TOAST_TYPES.SUCCESS);
            if (onComplete) onComplete(result);
        } catch (error) {
            console.error('Failed to save deck', error);
            showToast('Failed to save deck. Please try again.', TOAST_TYPES.ERROR);
        }
    };

    const handlePrintProxies = async (mode) => {
        if (!result) return;

        let cardsToPrint;

        if (mode === 'all') {
            // Print all cards in the deck
            cardsToPrint = result.deck.cards;
        } else if (mode === 'missing') {
            // Print only cards with total quantity less than needed
            cardsToPrint = result.deck.cards.filter(card => {
                const { total } = checkOwnership(card.name);
                const neededQty = card.quantity || 1;
                return total < neededQty;
            }).map(card => {
                const { total } = checkOwnership(card.name);
                const neededQty = card.quantity || 1;
                return {
                    ...card,
                    quantity: neededQty - total // Only print what's missing
                };
            });
        } else if (mode === 'unavailable') {
            // Print cards that are missing OR reserved (unavailable = missing + reserved)
            cardsToPrint = result.deck.cards.filter(card => {
                const { available } = checkOwnership(card.name);
                const neededQty = card.quantity || 1;
                return available < neededQty;
            }).map(card => {
                const { available } = checkOwnership(card.name);
                const neededQty = card.quantity || 1;
                return {
                    ...card,
                    quantity: neededQty - available // Print unavailable quantity
                };
            });
        }

        if (!cardsToPrint || cardsToPrint.length === 0) {
            showToast('No cards to print!', TOAST_TYPES.INFO);
            return;
        }

        const totalCardsToPrint = cardsToPrint.reduce((sum, c) => sum + (c.quantity || 1), 0);

        try {
            // TODO: Integrate actual payment gateway here
            // For now, just show confirmation and proceed
            // When ready, add Stripe/PayPal integration:
            // const paymentResult = await processPayment(cost);
            // if (!paymentResult.success) return;

            showToast(`Generating ${totalCardsToPrint} proxy cards...`, TOAST_TYPES.INFO);
            const { generateProxyPDF } = await import('../../utils/proxyGenerator');
            await generateProxyPDF(cardsToPrint);
            showToast('Proxy PDF generated successfully!', TOAST_TYPES.SUCCESS);
        } catch (error) {
            console.error('Failed to generate proxies', error);
            showToast('Failed to generate proxies. Please try again.', TOAST_TYPES.ERROR);
        }
    };

    // Calculate Deck Stats
    const deckStats = result ? result.deck.cards.reduce((acc, card) => {
        const cat = card.category || 'Other';
        acc[cat] = (acc[cat] || 0) + (card.quantity || 1);
        return acc;
    }, {}) : {};

    const maxStat = Math.max(...Object.values(deckStats), 1);

    // Prepare Display Cards - AI now includes Commander in the 100
    const displayCards = result ? result.deck.cards.map(c => ({
        ...c,
        isCommander: c.category === 'Commander' || c.name.toLowerCase() === result.commander.name.toLowerCase()
    })) : [];



    // Use Orb Animation Context
    const { absorbCard, registerOrb, ejectCard } = useOrbAnimation();

    // Helper to animate selection
    const handleWizardSelection = async (selectionId, e, onComplete) => {
        // 1. Capture start position from the clicked element
        let startRect = null;
        if (e && e.currentTarget) {
            startRect = e.currentTarget.getBoundingClientRect();
        }

        // 2. Trigger global absorption if we have coordinates
        if (startRect) {
            absorbCard(
                {
                    top: startRect.top,
                    left: startRect.left,
                    width: startRect.width,
                    height: startRect.height
                },
                { id: selectionId, title: selectionId }, // Card data
                () => {
                    // Optional: Callback when animation physically ends
                }
            );
        }

        // 3. Local state for hiding the original card (immediate or slight delay)
        setSelectionAnim(selectionId);

        // 4. Trigger Orb Reaction
        setOrbAbsorbing(true);

        // 5. Wait for visual "entry" before moving state (match animation duration approx)
        await new Promise(r => setTimeout(r, 1000));

        setOrbAbsorbing(false);
        setSelectionAnim(null);
        onComplete();
    };

    // Helper: is the orb loop active?
    const isGenerating = ['generating', 'ready', 'cracking'].includes(wizardState);
    const isWizardActive = ['step_commander', 'step_picker_show_card', 'step_source', 'step_budget', 'step_final_input', 'step_auth'].includes(wizardState);

    // Dynamic Title based on step
    const getStepTitle = () => {
        if (selectionAnim) return ""; // Hide title during transition
        switch (wizardState) {
            case 'step_commander': return "Choose your path";
            case 'step_picker': return "Summon your legend";
            case 'step_picker_show_card': return ""; // Hide during card display
            case 'step_source': return "Choose your source";
            case 'step_budget': return "Set your limits";
            case 'step_final_input': return deckConfig.commanderMode === 'specific' ? "Your command?" : "What do you seek?";
            case 'step_auth': return "Identify Yourself";
            default: return "";
        }
    };

    // Dynamic Scale based on progress
    const getOrbScale = () => {
        if (!isWizardActive) return 1.0;
        switch (wizardState) {
            case 'step_commander': return 1.0;
            case 'step_picker_show_card': return 1.1; // Card selected
            case 'step_source': return 1.15; // Source loop
            case 'step_budget': return 1.25; // Budget loop
            case 'step_final_input': return 1.35; // Ready to conjure
            case 'step_auth': return 1.4; // Auth step
            default: return 1.0;
        }
    };

    return (
        <div className={`flex flex-col p-4 gap-4 max-w-7xl mx-auto ${isGuest ? 'w-full h-full' : 'md:h-full h-[calc(100vh-100px)]'}`}>

            {/* Wizard & Orb Section */}
            {(wizardState === 'idle' || isGenerating || isWizardActive) && (
                <div className="flex-1 flex flex-col items-center justify-center transition-all duration-500">

                    {/* The Mystic Orb */}
                    <div className={`relative z-10 mb-5 transition-all duration-500 ${orbAbsorbing ? 'orb-container absorbing' : ''}`}>
                        <MysticOrb
                            ref={registerOrb}
                            state={wizardState === 'generating' ? 'loading' : (isGenerating ? wizardState : 'idle')}
                            size={isWizardActive ? 'small' : 'large'}
                            scale={getOrbScale()}
                            onClick={() => {
                                if (wizardState === 'idle') {
                                    setWizardState('step_commander');
                                } else if (wizardState === 'ready' && result) {
                                    setWizardState('cracking');
                                }
                            }}
                            loadingText={LOADING_STEPS[loadingStep]?.msg}
                            loadingIcon={LOADING_STEPS[loadingStep]?.icon}
                            onCrackComplete={() => {
                                // Animation finished, check result
                                if (result && !result.error) {
                                    // Trigger Ejection Animation
                                    // Target: Center of screen approx, or where the result card will be
                                    // Let's assume a central position for now
                                    const targetRect = {
                                        top: window.innerHeight / 2 - 150, // Approx center y - half height
                                        left: window.innerWidth / 2 - 100, // Approx center x - half width
                                        width: 200,
                                        height: 300
                                    };

                                    ejectCard(
                                        targetRect,
                                        {
                                            title: result.commander?.name || 'Your Deck',
                                            // You could pass icon/image here if available in 'result'
                                        },
                                        () => {
                                            setWizardState('complete');
                                        }
                                    );
                                } else {
                                    setWizardState('idle');
                                }
                            }}
                            absorbing={orbAbsorbing}
                        />
                    </div>
                    {/* Step Title with Back Button */}
                    {isWizardActive && !selectionAnim && (
                        <div className="w-full max-w-md flex items-center justify-between mb-6 animate-in slide-in-from-bottom-2 fade-in duration-500">
                            {wizardState !== 'step_commander' || showPickerFlipped ? (
                                <button
                                    onClick={() => {
                                        if (wizardState === 'step_commander' && showPickerFlipped) {
                                            setShowPickerFlipped(false);
                                        }
                                        else if (wizardState === 'step_picker_show_card') {
                                            // Go back to commander selection
                                            setShowPickerFlipped(false);
                                            setWizardState('step_commander');
                                        }
                                        else if (wizardState === 'step_picker') {
                                            setWizardState('step_commander');
                                            setShowPickerFlipped(false);
                                        }
                                        else if (wizardState === 'step_source') {
                                            if (deckConfig.commanderMode === 'specific') {
                                                // Go back to commander selection with picker open
                                                setShowPickerFlipped(true);
                                                setWizardState('step_commander');
                                            } else {
                                                setShowPickerFlipped(false);
                                                setWizardState('step_commander');
                                            }
                                        }
                                        else if (wizardState === 'step_budget') setWizardState('step_source');
                                        else if (wizardState === 'step_final_input') {
                                            setWizardState(deckConfig.source === 'inventory' ? 'step_source' : 'step_budget');
                                        }
                                        else if (wizardState === 'step_auth') setWizardState('step_final_input');
                                    }}
                                    className="text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                    <span className="text-sm">{wizardState === 'step_auth' ? 'Cancel' : 'Back'}</span>
                                </button>
                            ) : (
                                <div className="w-16" /> // Empty spacer for first step
                            )}
                            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-white">
                                {getStepTitle()}
                            </h2>
                            <div className="w-16"></div> {/* Spacer for balance */}
                        </div>
                    )}

                    {/* 1. Commander Step - NOW FIRST */}
                    {wizardState === 'step_commander' && (
                        <div className="w-full max-w-md grid grid-cols-1 md:grid-cols-2 gap-3 card-3d-wrapper">
                            <WizardOptionCard
                                icon={Dices}
                                title="Random Commander"
                                description="Let the Orb decide based on your theme or prompt."
                                className={selectionAnim === 'random' ? 'opacity-0' : (selectionAnim ? 'opacity-0 transition-opacity duration-300' : 'animate-in slide-in-from-bottom-8 fade-in duration-500')}
                                onClick={(e) => handleWizardSelection('random', e, () => {
                                    updateConfig('commanderMode', 'random');
                                    setShowPickerFlipped(false);
                                    setWizardState('step_source');
                                })}
                            />
                            <WizardOptionCard
                                icon={Search}
                                title="Specific Commander"
                                description="Search for a specific legendary creature."
                                className={
                                    selectionAnim === 'specific' ? 'opacity-0' :
                                        selectionAnim ? 'opacity-0 transition-opacity duration-300' :
                                            showPickerFlipped ? 'animate-card-flip' :
                                                'animate-in slide-in-from-bottom-8 fade-in duration-500'
                                }
                                onClick={() => {
                                    if (!showPickerFlipped) {
                                        updateConfig('commanderMode', 'specific');
                                        setShowPickerFlipped(true);
                                        // Do NOT setWizardState('step_picker_show_card') here.
                                        // We stay in step_commander until a card is actually selected in the picker.
                                    }
                                }}
                                backContent={showPickerFlipped ? (
                                    <div className="h-full p-6 bg-[#0d0d15] border border-white/10 rounded-xl flex flex-col overflow-hidden">
                                        <h3 className="text-lg font-bold text-white mb-3">Summon your Legend</h3>
                                        <CommanderPicker
                                            isOpen={true}
                                            onSelect={async (cmd, e) => {
                                                // 1. Capture Rect immediately
                                                const startRect = e?.currentTarget?.getBoundingClientRect() || null;

                                                updateConfig('commander', cmd);
                                                updateConfig('commanderMode', 'specific');

                                                // 2. Trigger Animation (if rect exists)
                                                if (startRect) {
                                                    absorbCard({
                                                        top: startRect.top,
                                                        left: startRect.left,
                                                        width: startRect.width,
                                                        height: startRect.height
                                                    }, {
                                                        // Pass minimal data for the flying card visual
                                                        image: cmd.imageUrl || '',
                                                        title: cmd.name
                                                    }, () => {
                                                        // 3. Update State AFTER Animation
                                                        setWizardState('step_picker_show_card');
                                                        setShowPickerFlipped(false);
                                                    });
                                                } else {
                                                    // Fallback if no rect (e.g. keyboard nav)
                                                    setWizardState('step_picker_show_card');
                                                    setShowPickerFlipped(false);
                                                }
                                            }}
                                        />
                                    </div>
                    ) : null}
                            />
                </div>
            )}

            {/* 1b. Show Commander Card Before Insert */}
            {wizardState === 'step_picker_show_card' && deckConfig.commander && (
                <div className="w-full max-w-md grid grid-cols-1 md:grid-cols-2 gap-3 card-3d-wrapper">
                    {/* Empty first column to match layout */}
                    <div className="hidden md:block" />
                    <div
                        className={`aspect-[3/4] rounded-xl overflow-hidden shadow-2xl ${selectionAnim === 'commander-card' ? 'opacity-0' : 'animate-commander-summon'}`}
                        style={{
                            backgroundImage: deckConfig.commander.imageUrl ? `url(${deckConfig.commander.imageUrl})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: '2px solid rgba(250, 204, 21, 0.5)',
                            boxShadow: '0 0 40px rgba(250, 204, 21, 0.3)'
                        }}
                    />
                </div>
            )}

            {/* 2. Source Step - NOW SECOND */}
            {wizardState === 'step_source' && (
                <div className="w-full max-w-md grid grid-cols-1 md:grid-cols-2 gap-3 card-3d-wrapper">
                    <WizardOptionCard
                        icon={Layers}
                        title="Multiverse"
                        description="Access the full Magic multiverse."
                        selected={deckConfig.source === 'multiverse'}
                        className={selectionAnim === 'multiverse' ? 'opacity-0' : (selectionAnim ? 'opacity-0 transition-opacity duration-300' : 'animate-in slide-in-from-bottom-8 fade-in duration-500')}
                        onClick={(e) => handleWizardSelection('multiverse', e, () => {
                            updateConfig('source', 'multiverse');
                            setWizardState('step_budget');
                        })}
                    />
                    <WizardOptionCard
                        icon={Lock}
                        title="Stash Only"
                        description="Build strictly from your inventory."
                        selected={deckConfig.source === 'inventory'}
                        className={selectionAnim === 'inventory' ? 'opacity-0' : (selectionAnim ? 'opacity-0 transition-opacity duration-300' : 'animate-in slide-in-from-bottom-8 fade-in duration-500')}
                        onClick={(e) => handleWizardSelection('inventory', e, () => {
                            if (isGuest) return; // Guests cannot use inventory
                            updateConfig('source', 'inventory');
                            setWizardState('step_final_input');
                        })}
                        disabled={isGuest}
                        badge={isGuest ? "Login Required" : null}
                    />
                </div>
            )}

            {/* 3. Budget Step */}
            {wizardState === 'step_budget' && (
                <div className="w-full max-w-md flex flex-col items-center gap-6 animate-in slide-in-from-bottom-8 fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full card-3d-wrapper">
                        <WizardOptionCard
                            title="Limited"
                            description={deckConfig.budget !== 'Unlimited' ? null : "Set a specific budget cap."}
                            selected={deckConfig.budget !== 'Unlimited'}
                            className={selectionAnim === 'limited' ? 'opacity-0' : (selectionAnim ? 'opacity-0 transition-opacity duration-300' : '')}
                            onClick={() => {
                                if (deckConfig.budget === 'Unlimited') updateConfig('budget', 200);
                            }}
                        >
                            {deckConfig.budget !== 'Unlimited' && (
                                <div className="w-full mt-2 space-y-2 animate-in fade-in slide-in-from-bottom-2" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Limit</span>
                                        <span className="text-xl font-bold text-green-400">${deckConfig.budget}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="50"
                                        max="1000"
                                        step="50"
                                        value={deckConfig.budget || 200}
                                        onChange={(e) => updateConfig('budget', Number(e.target.value))}
                                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                    />
                                    <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                                        <span>$50</span>
                                        <span>$1000+</span>
                                    </div>
                                    <div className="pt-2 flex justify-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleWizardSelection('limited', e, () => setWizardState('step_final_input'));
                                            }}
                                            className="w-full px-4 py-2 bg-white text-black text-sm font-bold rounded-lg hover:scale-105 transition-transform shadow-lg hover:shadow-white/20"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </WizardOptionCard>
                        <WizardOptionCard
                            icon={Wallet}
                            title="Unlimited"
                            description="No budget constraints."
                            selected={deckConfig.budget === 'Unlimited'}
                            className={selectionAnim === 'unlimited' ? 'opacity-0' : (selectionAnim ? 'opacity-0 transition-opacity duration-300' : '')}
                            onClick={(e) => handleWizardSelection('unlimited', e, () => {
                                updateConfig('budget', 'Unlimited');
                                setWizardState('step_final_input');
                            })}
                        />
                    </div>


                </div>
            )}

            {/* 4. Final Input Step - LAST */}
            {/* 4. Final Input Step - LAST */}
            {wizardState === 'step_final_input' && (
                <div className="w-full max-w-md flex justify-center card-3d-wrapper">
                    <div className={`w-full md:w-[calc(50%-0.375rem)] aspect-[3/4] relative ${selectionAnim === 'final_input' ? 'opacity-0' : (selectionAnim ? 'opacity-0 transition-opacity duration-300' : 'animate-in slide-in-from-bottom-8 fade-in duration-500')}`}>
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl opacity-0 group-hover:opacity-100 transition duration-500 blur pointer-events-none"></div>
                        <Card className="relative h-full p-4 border transition-all duration-300 flex flex-col items-center justify-between text-center gap-2 bg-[#0d0d15] border-white/10 hover:bg-white/5 group">
                            <div className="flex-1 flex flex-col justify-center w-full">
                                <h3 className="text-lg font-bold mb-2 text-gray-200">
                                    Your command?
                                </h3>

                                <input
                                    type="text"
                                    value={deckConfig.prompt}
                                    onChange={(e) => updateConfig('prompt', e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleGenerate();
                                        }
                                    }}
                                    placeholder={deckConfig.commanderMode === 'specific'
                                        ? `Theme? (Optional)`
                                        : "E.g. 'Dragon Deck'"
                                    }
                                    className="w-full bg-[var(--input-bg)] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors mb-2"
                                    autoFocus
                                />

                                {deckConfig.commanderMode === 'specific' && (
                                    <p className="text-[10px] text-gray-500 mb-2 leading-tight">
                                        Leave blank to let the AI decide.
                                    </p>
                                )}

                                <button
                                    onClick={handleGenerate}
                                    disabled={wizardState !== 'step_final_input'}
                                    className={`w-full px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${wizardState !== 'step_final_input'
                                        ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                                        : 'bg-white text-black hover:scale-105 shadow-lg hover:shadow-white/20'
                                        }`}
                                >
                                    <Sparkles className="w-4 h-4" />
                                    <span>Conjure</span>
                                </button>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* 5. Auth Step (Guest Only) */}
            {wizardState === 'step_auth' && (
                <div className="w-full max-w-sm flex justify-center card-3d-wrapper">
                    <div className="w-full aspect-[3/4] animate-in slide-in-from-bottom-8 fade-in duration-500 relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl opacity-75 blur"></div>
                        <Card className="relative h-full p-6 bg-[#0d0d15] border-white/10 flex flex-col justify-center gap-4">
                            <div className="text-center mb-2">
                                <h3 className="text-xl font-bold text-white mb-1">
                                    {authMode === 'signup' ? 'Begin Your Journey' : 'Welcome Back'}
                                </h3>
                                <p className="text-sm text-gray-400">
                                    {authMode === 'signup'
                                        ? 'Create an account to conjure your deck.'
                                        : 'Sign in to access your wizardry.'}
                                </p>
                            </div>

                            <form onSubmit={handleGuestAuth} className="space-y-3">
                                <Input
                                    label="Email"
                                    type="email"
                                    value={authEmail}
                                    onChange={(e) => setAuthEmail(e.target.value)}
                                    placeholder="wizard@example.com"
                                    required
                                    className="bg-[var(--input-bg)]"
                                    autoFocus
                                />
                                <Input
                                    label="Password"
                                    type="password"
                                    value={authPassword}
                                    onChange={(e) => setAuthPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="bg-[var(--input-bg)]"
                                />

                                {authError && <Alert variant="error" className="py-2 text-xs">{authError}</Alert>}

                                <Button
                                    type="submit"
                                    variant="primary"
                                    fullWidth
                                    loading={authLoading}
                                    className="mt-2 shadow-lg hover:shadow-purple-500/25"
                                >
                                    {authLoading ? 'Authenticating...' : (authMode === 'signup' ? 'Summon Account' : 'Enter Vault')}
                                </Button>
                            </form>

                            <div className="pt-2 border-t border-white/10 text-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAuthMode(authMode === 'signup' ? 'login' : 'signup');
                                        setAuthError('');
                                    }}
                                    className="text-xs text-gray-400 hover:text-white transition-colors"
                                >
                                    {authMode === 'signup'
                                        ? 'Already have an account? Sign in'
                                        : "Don't have an account? Sign up"}
                                </button>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    )
}

{/* Results Section - shown after orb reveal */ }
{
    wizardState === 'complete' && result && (
        <div className="flex-1 md:overflow-hidden flex flex-col gap-4 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col gap-1 w-full md:w-auto">
                    <h2 className="text-xl font-bold">{result.commander.name}</h2>
                    {/* Mobile Tabs */}
                    <div className="flex md:hidden bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border)] w-full">
                        <button
                            onClick={() => setActiveMobileTab('deck')}
                            className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${activeMobileTab === 'deck' ? 'bg-[var(--surface-highlight)] text-white shadow-sm' : 'text-[var(--text-muted)]'}`}
                        >
                            Decklist
                        </button>
                        <button
                            onClick={() => setActiveMobileTab('stats')}
                            className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${activeMobileTab === 'stats' ? 'bg-[var(--surface-highlight)] text-white shadow-sm' : 'text-[var(--text-muted)]'}`}
                        >
                            Analysis
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                    <div className="bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border)] flex gap-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-[var(--surface-highlight)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-white'}`}
                        >
                            List
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-[var(--surface-highlight)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-white'}`}
                        >
                            Grid
                        </button>
                    </div>
                    <Button onClick={handleSaveDeck} variant="secondary">
                        <Save className="w-4 h-4 mr-2" /> <span className="hidden sm:inline">Save Deck</span><span className="sm:hidden">Save</span>
                    </Button>
                    <Button onClick={() => setShowPrintModal(true)} variant="primary" className="bg-amber-600 hover:bg-amber-700">
                        <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            <span className="hidden sm:inline">Print Proxies</span><span className="sm:hidden">Print</span>
                        </div>
                    </Button>
                    <Button
                        onClick={() => setShowBuyModal(true)}
                        variant="primary"
                        className="bg-green-600 hover:bg-green-700"
                        disabled={getUnavailableCards().length === 0}
                    >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Buy Unavailable</span><span className="sm:hidden">Buy</span>
                    </Button>
                    <Button onClick={handleNewDeck} variant="secondary" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">New Deck</span><span className="sm:hidden">New</span>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:h-full md:overflow-hidden">
                {/* Main Deck Display */}
                <div className={`col-span-2 flex flex-col md:h-full md:overflow-hidden ${activeMobileTab === 'deck' ? 'block' : 'hidden md:flex'}`}>
                    <Card className="flex flex-col h-full md:overflow-hidden">
                        <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-highlight)]">
                            <h3 className="font-semibold">Suggested Decklist</h3>
                            <p className="text-sm text-[var(--text-muted)]">{result.deck.description}</p>
                        </div>

                        <div className="flex-1 p-4 custom-scrollbar md:overflow-y-auto min-h-[500px] md:min-h-0">
                            {viewMode === 'list' ? (
                                <div className="space-y-1">
                                    {displayCards.map((card, idx) => {
                                        const { total } = checkOwnership(card.name);
                                        const isOwned = total > 0 || card.isCommander;
                                        return (
                                            <div key={idx} className={`flex items-center justify-between p-2 rounded hover:bg-[var(--bg-secondary)] group ${isOwned ? 'bg-green-500/5' : ''} ${card.isCommander ? 'border border-amber-500/20 bg-amber-500/5' : ''}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isOwned ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                                        {isOwned ? <Check className="w-3 h-3" /> : <ShoppingCart className="w-3 h-3" />}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-medium ${card.isCommander ? 'text-amber-400' : ''}`}>{card.quantity}x {card.name}</span>
                                                        <span className="text-xs text-[var(--text-muted)] px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border)]">{card.category}</span>
                                                    </div>
                                                </div>
                                                {card.reason && (
                                                    <div className="text-xs text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity italic max-w-[40%] text-right truncate">
                                                        {card.reason}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {displayCards.map((card, idx) => {
                                        const inventoryItem = inventory.find(c => c.name.toLowerCase() === card.name.toLowerCase());
                                        // Fallback for image: Inventory -> Scryfall Named -> Placeholder
                                        const imageUrl = inventoryItem?.image_url || `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image`;
                                        const isOwned = !!inventoryItem || card.isCommander;

                                        return (
                                            <div key={idx} className={`relative group aspect-[2.5/3.5] bg-[var(--bg-secondary)] rounded-lg overflow-hidden border border-[var(--border)] shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 ${card.isCommander ? 'ring-2 ring-amber-500 shadow-amber-500/20' : ''}`}>
                                                <img
                                                    src={imageUrl}
                                                    alt={card.name}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.target.src = 'https://cards.scryfall.io/large/front/4/0/409c938e-9ac8-4100-84c4-f63b03657af3.jpg?1562854638'; }}
                                                />

                                                {/* Card Overlay Info */}
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end">
                                                    <p className={`text-xs font-bold truncate ${card.isCommander ? 'text-amber-400' : 'text-white'}`}>{card.name}</p>
                                                    <p className="text-gray-300 text-[10px]">{card.category}</p>
                                                </div>

                                                {/* Indicators */}
                                                {isOwned && (
                                                    <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-0.5 shadow-md transform scale-90">
                                                        <Check className="w-3 h-3" />
                                                    </div>
                                                )}
                                                {!isOwned && (
                                                    <div className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 shadow-md backdrop-blur-sm">
                                                        <ShoppingCart className="w-3 h-3" />
                                                    </div>
                                                )}

                                                {/* Quantity Badge */}
                                                {card.quantity > 1 && (
                                                    <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm border border-white/10">
                                                        x{card.quantity}
                                                    </div>
                                                )}

                                                {/* Commander Badge */}
                                                {card.isCommander && (
                                                    <div className="absolute top-1 left-1 bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg">
                                                        CMD
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Stats / Info Side */}
                <div className={`flex flex-col gap-4 md:overflow-y-auto custom-scrollbar ${activeMobileTab === 'stats' ? 'block' : 'hidden md:flex'}`}>
                    {/* Inventory Match */}
                    <Card className="p-4">
                        <h3 className="font-semibold mb-2">Inventory Match</h3>
                        <div className="text-3xl font-bold text-green-400">
                            {result.deck.cards.reduce((sum, c) => {
                                const { total } = checkOwnership(c.name);
                                return total > 0 ? sum + (c.quantity || 1) : sum;
                            }, 0)} / {result.deck.cards.reduce((sum, c) => sum + (c.quantity || 1), 0)}
                        </div>
                        <p className="text-sm text-[var(--text-muted)]">Cards owned</p>
                    </Card>

                    {/* Inventory-Only Mode Stats */}
                    {result.deck.inventoryStats && (
                        <Card className="p-4 bg-[var(--bg-secondary)]">
                            <h3 className="font-semibold mb-2">Inventory Usage</h3>
                            <div className="text-2xl font-bold text-purple-400">
                                {result.deck.inventoryStats.fromInventory} / {result.deck.inventoryStats.total}
                            </div>
                            <p className="text-sm text-[var(--text-muted)]">
                                {result.deck.inventoryStats.percentage}% from your inventory
                            </p>
                        </Card>
                    )}

                    {/* Inventory-Only Mode Warnings */}
                    {result.deck.inventoryWarning && (
                        <Card className="p-4 bg-amber-600/10 border-amber-600/20">
                            <h3 className="font-semibold text-amber-600 mb-2 flex items-center gap-2">
                                <span>⚠️</span> Inventory-Only Mode Warning
                            </h3>
                            <p className="text-sm mb-3">{result.deck.inventoryWarning.message}</p>
                            {result.deck.inventoryWarning.invalidCards.length > 0 && (
                                <details className="mt-2">
                                    <summary className="text-sm cursor-pointer font-medium mb-2">
                                        Cards not in inventory ({result.deck.inventoryWarning.invalidCards.length})
                                    </summary>
                                    <ul className="mt-1 text-xs list-disc list-inside space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                        {result.deck.inventoryWarning.invalidCards.map((card, idx) => (
                                            <li key={idx}>{card}</li>
                                        ))}
                                    </ul>
                                </details>
                            )}
                            {result.deck.inventoryWarning.insufficientCards.length > 0 && (
                                <details className="mt-2">
                                    <summary className="text-sm cursor-pointer font-medium mb-2">
                                        Insufficient quantity ({result.deck.inventoryWarning.insufficientCards.length})
                                    </summary>
                                    <ul className="mt-1 text-xs list-disc list-inside space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                        {result.deck.inventoryWarning.insufficientCards.map((card, idx) => (
                                            <li key={idx}>{card.name} (need {card.needed}, have {card.available})</li>
                                        ))}
                                    </ul>
                                </details>
                            )}
                        </Card>
                    )}

                    {/* Quick Stats */}
                    <Card className="p-4">
                        <h3 className="font-semibold mb-3">Quick Stats</h3>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-[var(--bg-secondary)] p-3 rounded-lg">
                                <div className="text-xl font-bold text-blue-400">
                                    {result.deck.cards.reduce((sum, c) => sum + (c.quantity || 1), 0)}
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">Total Cards</div>
                            </div>
                            <div className="bg-[var(--bg-secondary)] p-3 rounded-lg">
                                <div className="text-xl font-bold text-amber-400">
                                    {result.deck.cards.filter(c => c.category === 'Land').reduce((sum, c) => sum + (c.quantity || 1), 0)}
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">Lands</div>
                            </div>
                            <div className="bg-[var(--bg-secondary)] p-3 rounded-lg">
                                <div className="text-xl font-bold text-red-400">
                                    {result.deck.cards.reduce((sum, c) => {
                                        const { total } = checkOwnership(c.name);
                                        return total === 0 ? sum + (c.quantity || 1) : sum;
                                    }, 0)}
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">Cards to Buy</div>
                            </div>
                            <div className="bg-[var(--bg-secondary)] p-3 rounded-lg">
                                <div className="text-xl font-bold text-purple-400">
                                    {new Set(result.deck.cards.map(c => c.name)).size}
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">Unique Cards</div>
                            </div>
                        </div>

                        <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Estimated Market Cost</h4>
                        <div className="space-y-2">
                            <div className="flex flex-col gap-3 mt-2">
                                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] opacity-50 cursor-not-allowed w-full">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                                            <TCGPlayerBrandIcon className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-xs text-[var(--text-muted)]">Marketplace Removed</div>
                                            <div className="font-semibold text-sm">TCGPlayer</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] opacity-50 cursor-not-allowed w-full">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                                            <CardKingdomBrandIcon className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-xs text-[var(--text-muted)]">Marketplace Removed</div>
                                            <div className="font-semibold text-sm">Card Kingdom</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Mana Curve */}
                    <Card className="p-4">
                        <h3 className="font-semibold mb-3">Mana Curve</h3>
                        <div className="flex items-end justify-between gap-1 h-24">
                            {[0, 1, 2, 3, 4, 5, 6, 7].map(cmc => {
                                const count = result.deck.cards
                                    .filter(c => c.category !== 'Land')
                                    .filter(c => cmc === 7 ? (c.cmc || 0) >= 7 : (c.cmc || 0) === cmc)
                                    .reduce((sum, c) => sum + (c.quantity || 1), 0);
                                const maxCurve = Math.max(...[0, 1, 2, 3, 4, 5, 6, 7].map(mv =>
                                    result.deck.cards.filter(c => c.category !== 'Land').filter(c => mv === 7 ? (c.cmc || 0) >= 7 : (c.cmc || 0) === mv).reduce((s, c) => s + (c.quantity || 1), 0)
                                ), 1);
                                return (
                                    <div key={cmc} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                                        <div className="w-full flex-1 flex items-end">
                                            <div
                                                className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t"
                                                style={{ height: `${(count / maxCurve) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-[var(--text-muted)] leading-none">{cmc === 7 ? '7+' : cmc}</span>
                                        <span className="text-[10px] font-mono leading-none">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Color Distribution */}
                    <Card className="p-4">
                        <h3 className="font-semibold mb-3">Colors</h3>
                        <div className="flex gap-2 flex-wrap">
                            {['W', 'U', 'B', 'R', 'G', 'C'].map(color => {
                                const count = result.deck.cards
                                    .filter(c => c.category !== 'Land')
                                    .filter(c => color === 'C' ? (!c.colors || c.colors === '') : (c.colors || '').includes(color))
                                    .reduce((sum, c) => sum + (c.quantity || 1), 0);
                                const colorMap = { W: 'bg-amber-100 text-amber-800', U: 'bg-blue-500 text-white', B: 'bg-gray-800 text-white', R: 'bg-red-500 text-white', G: 'bg-green-600 text-white', C: 'bg-gray-400 text-gray-800' };
                                const nameMap = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green', C: 'Colorless' };
                                if (count === 0) return null;
                                return (
                                    <div key={color} className={`px-3 py-2 rounded-lg ${colorMap[color]} text-center`}>
                                        <div className="text-lg font-bold">{count}</div>
                                        <div className="text-xs opacity-80">{nameMap[color]}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Card Types */}
                    <Card className="p-4">
                        <h3 className="font-semibold mb-3">Card Types</h3>
                        <div className="space-y-2">
                            {['Creature', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Planeswalker'].map(type => {
                                const count = result.deck.cards
                                    .filter(c => (c.cardType || '').includes(type))
                                    .reduce((sum, c) => sum + (c.quantity || 1), 0);
                                const maxType = Math.max(...['Creature', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Planeswalker'].map(t =>
                                    result.deck.cards.filter(c => (c.cardType || '').includes(t)).reduce((s, c) => s + (c.quantity || 1), 0)
                                ), 1);
                                if (count === 0) return null;
                                return (
                                    <div key={type}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-[var(--text-muted)]">{type}s</span>
                                            <span className="font-mono">{count}</span>
                                        </div>
                                        <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500/80 rounded-full" style={{ width: `${(count / maxType) * 100}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Category Breakdown */}
                    <Card className="p-4">
                        <h3 className="font-semibold mb-3">Deck Roles</h3>
                        <div className="space-y-3">
                            {Object.entries(deckStats).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                                <div key={cat}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-[var(--text-muted)]">{cat}</span>
                                        <span className="font-mono">{count}</span>
                                    </div>
                                    <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${cat === 'Land' ? 'bg-amber-500/80' :
                                                cat === 'Commander' ? 'bg-purple-500/80' :
                                                    cat === 'Ramp' ? 'bg-green-500/80' :
                                                        cat === 'Draw' ? 'bg-blue-500/80' :
                                                            cat === 'Removal' ? 'bg-red-500/80' :
                                                                'bg-slate-500/80'
                                                }`}
                                            style={{ width: `${(count / maxStat) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}

{/* Print Proxies Modal */ }
{
    showPrintModal && result && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg max-w-md w-full p-6">
                <h2 className="text-xl font-bold mb-4">Print Proxy Cards</h2>

                {(() => {
                    const totalCards = result.deck.cards.reduce((sum, c) => sum + (c.quantity || 1), 0);

                    // Calculate missing cards (don't own at all)
                    const missingCount = result.deck.cards.reduce((sum, card) => {
                        const { total } = checkOwnership(card.name);
                        const neededQty = card.quantity || 1;
                        return sum + Math.max(0, neededQty - total);
                    }, 0);

                    // Calculate unavailable cards (missing + reserved)
                    const unavailableCount = result.deck.cards.reduce((sum, card) => {
                        const { available } = checkOwnership(card.name);
                        const neededQty = card.quantity || 1;
                        return sum + Math.max(0, neededQty - available);
                    }, 0);

                    const ownedCount = totalCards - missingCount;
                    const reservedCount = unavailableCount - missingCount;

                    return (
                        <>
                            <div className="space-y-3 mb-6">
                                <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-[var(--text-muted)]">Total cards in deck:</span>
                                        <span className="font-semibold">{totalCards}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-[var(--text-muted)]">Cards you own:</span>
                                        <span className="font-semibold text-green-400">{ownedCount}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-[var(--text-muted)]">Missing cards:</span>
                                        <span className="font-semibold text-amber-400">{missingCount}</span>
                                    </div>
                                    {reservedCount > 0 && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[var(--text-muted)]">Reserved in decks:</span>
                                            <span className="font-semibold text-blue-400">{reservedCount}</span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        setShowPrintModal(false);
                                        handlePrintProxies('all');
                                    }}
                                    className="w-full p-4 bg-[var(--bg-secondary)] hover:bg-[var(--surface-highlight)] border border-[var(--border)] rounded-lg text-left transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold">Print All Cards</div>
                                            <div className="text-sm text-[var(--text-muted)]">{totalCards} cards total</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-amber-400">${(totalCards * 0.01).toFixed(2)}</div>
                                            <div className="text-xs text-[var(--text-muted)]">$0.01/card</div>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        if (missingCount === 0) return;
                                        setShowPrintModal(false);
                                        handlePrintProxies('missing');
                                    }}
                                    disabled={missingCount === 0}
                                    className={`w-full p-4 border rounded-lg text-left transition-colors ${missingCount > 0
                                        ? 'bg-amber-600/10 hover:bg-amber-600/20 border-amber-600/30 cursor-pointer'
                                        : 'bg-[var(--bg-secondary)]/50 border-[var(--border)]/50 cursor-not-allowed opacity-50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold flex items-center gap-2">
                                                Print Missing Cards Only
                                                {missingCount > 0 && (
                                                    <span className="px-2 py-0.5 bg-amber-600 text-white text-xs rounded-full">Recommended</span>
                                                )}
                                                {missingCount === 0 && (
                                                    <span className="px-2 py-0.5 bg-green-600/50 text-[var(--text-muted)] text-xs rounded-full flex items-center gap-1">
                                                        <Check className="w-3 h-3" />
                                                        All Owned
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-[var(--text-muted)]">
                                                {missingCount > 0
                                                    ? `${missingCount} cards you don't own`
                                                    : 'You already own all cards in this deck'
                                                }
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {missingCount > 0 ? (
                                                <>
                                                    <div className="text-lg font-bold text-amber-400">${(missingCount * 0.01).toFixed(2)}</div>
                                                    <div className="text-xs text-green-400">Save ${((totalCards - missingCount) * 0.01).toFixed(2)}</div>
                                                </>
                                            ) : (
                                                <div className="text-sm text-[var(--text-muted)]">—</div>
                                            )}
                                        </div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        if (unavailableCount === 0) return;
                                        setShowPrintModal(false);
                                        handlePrintProxies('unavailable');
                                    }}
                                    disabled={unavailableCount === 0}
                                    className={`w-full p-4 border rounded-lg text-left transition-colors ${unavailableCount > 0
                                        ? 'bg-blue-600/10 hover:bg-blue-600/20 border-blue-600/30 cursor-pointer'
                                        : 'bg-[var(--bg-secondary)]/50 border-[var(--border)]/50 cursor-not-allowed opacity-50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold flex items-center gap-2">
                                                Print Unavailable Cards
                                                {unavailableCount > missingCount && (
                                                    <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">Best Value</span>
                                                )}
                                                {unavailableCount === 0 && (
                                                    <span className="px-2 py-0.5 bg-green-600/50 text-[var(--text-muted)] text-xs rounded-full flex items-center gap-1">
                                                        <Check className="w-3 h-3" />
                                                        All Available
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-[var(--text-muted)]">
                                                {unavailableCount > 0
                                                    ? `${unavailableCount} cards (${missingCount} missing + ${reservedCount} reserved)`
                                                    : 'All cards are available in your inventory'
                                                }
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {unavailableCount > 0 ? (
                                                <>
                                                    <div className="text-lg font-bold text-blue-400">${(unavailableCount * 0.01).toFixed(2)}</div>
                                                    <div className="text-xs text-green-400">Save ${((totalCards - unavailableCount) * 0.01).toFixed(2)}</div>
                                                </>
                                            ) : (
                                                <div className="text-sm text-[var(--text-muted)]">—</div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            </div>

                            <button
                                onClick={() => setShowPrintModal(false)}
                                className="w-full py-2 text-[var(--text-muted)] hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                        </>
                    );
                })()}
            </div>
        </div>
    )
}

{/* Buy Unavailable Cards Modal */ }
{
    showBuyModal && result && (
        <BuyCardsModal
            isOpen={showBuyModal}
            onClose={() => setShowBuyModal(false)}
            cards={getUnavailableCards()}
            deckName={result.commander.name}
        />
    )
}
        </div >
    );
}
