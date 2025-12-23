import React, { useState, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useApi } from '../../hooks/useApi';
import { useToast, TOAST_TYPES } from '../../context/ToastContext';
import { Sparkles, Save, Search, RefreshCw, Check, ShoppingCart } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

const LOADING_STEPS = [
    { step: 0, msg: 'Identifying Commander...', icon: '🔮' },
    { step: 1, msg: 'Fetching EDHREC data...', icon: '📊' },
    { step: 2, msg: 'Analyzing MTGGoldfish decks...', icon: '🐟' },
    { step: 3, msg: 'Pondering Orbs...', icon: '🔮' },
    { step: 4, msg: 'Building synergies...', icon: '⚡' },
    { step: 5, msg: 'Optimizing mana curve...', icon: '📈' },
    { step: 6, msg: 'Finalizing deck...', icon: '✨' },
];

export default function AIDeckBuilder() {
    const { post, put } = useApi();
    const { inventory } = useInventory();
    const { showToast } = useToast();

    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [result, setResult] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'list' | 'grid'
    const [activeMobileTab, setActiveMobileTab] = useState('deck'); // 'deck' | 'stats'
    const [budget, setBudget] = useState(200); // Dollar budget
    const [useBudget, setUseBudget] = useState(false); // Budget toggle

    // Animate through loading steps
    useEffect(() => {
        if (!loading) {
            setLoadingStep(0);
            return;
        }
        const interval = setInterval(() => {
            setLoadingStep(prev => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
        }, 2500); // Progress every 2.5 seconds
        return () => clearInterval(interval);
    }, [loading]);

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!prompt) return;

        setLoading(true);
        setResult(null);

        try {
            const data = await post('/ai/generate', {
                commander: prompt,
                theme: 'General Prompt',
                budget: useBudget ? budget : null, // Only send if enabled
                bracket: 3 // Default mid-power, can be specified in prompt
            });

            setResult(data);
        } catch (error) {
            console.error('Generation failed', error);
            showToast('Failed to generate deck. Try again.', TOAST_TYPES.ERROR);
        } finally {
            setLoading(false);
        }
    };

    // Helper to check ownership (mocked or from context)
    const checkOwnership = (cardName) => {
        const found = inventory.find(c => c.name.toLowerCase() === cardName.toLowerCase());
        return found ? found.quantity : 0;
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
        } catch (error) {
            console.error('Failed to save deck', error);
            showToast('Failed to save deck. Please try again.', TOAST_TYPES.ERROR);
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

    // ... (rest of logic) ...

    return (
        <div className="md:h-full flex flex-col p-4 gap-4 max-w-7xl mx-auto">
            {/* Header / Input Section */}
            <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-600 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Sparkles className="w-5 h-5 text-white animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-purple-400">
                            The Orb
                        </h1>
                        <p className="text-[var(--text-muted)] text-sm">
                            Consult the oracle to build your next masterpiece
                        </p>
                    </div>
                </div>

                <form onSubmit={handleGenerate} className="flex flex-col gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1 text-[var(--text-muted)]">What do you seek?</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g. A deck led by Atraxa focused on +1/+1 counters..."
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-3 pl-10 focus:ring-2 focus:ring-fuchsia-500/50 outline-none transition-all"
                            />
                            <Search className="w-4 h-4 absolute left-3 top-3.5 text-[var(--text-muted)]" />
                        </div>
                    </div>


                    {/* Budget Slider (Optional) */}
                    <div className="flex items-start gap-4">
                        <label className="flex items-center gap-2 cursor-pointer mt-1">
                            <input
                                type="checkbox"
                                checked={useBudget}
                                onChange={(e) => setUseBudget(e.target.checked)}
                                className="w-4 h-4 rounded border-[var(--border)] bg-[var(--bg-secondary)] accent-purple-600"
                            />
                            <span className="text-sm text-[var(--text-muted)]">Set Budget</span>
                        </label>
                        {useBudget && (
                            <div className="flex-1">
                                <label className="block text-sm font-medium mb-2 text-[var(--text-muted)]">
                                    Budget: <span className="text-[var(--accent)] font-bold">${budget}</span>
                                </label>
                                <input
                                    type="range"
                                    min="50"
                                    max="2000"
                                    step="50"
                                    value={budget}
                                    onChange={(e) => setBudget(parseInt(e.target.value))}
                                    className="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-purple-600"
                                />
                                <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                                    <span>$50</span>
                                    <span>$500</span>
                                    <span>$2000</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={loading || !prompt}
                            className="bg-purple-600 hover:bg-purple-700 w-full md:w-auto"
                        >
                            {loading ? (
                                <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Conjuring...</>
                            ) : (
                                <><Sparkles className="w-4 h-4 mr-2" /> Conjure Deck</>
                            )}
                        </Button>
                    </div>
                </form>
            </Card>

            {/* Loading Progress */}
            {loading && (
                <Card className="p-6 animate-fade-in">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="text-3xl animate-bounce">{LOADING_STEPS[loadingStep]?.icon}</div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg">{LOADING_STEPS[loadingStep]?.msg}</h3>
                            <p className="text-sm text-[var(--text-muted)]">Building your 100-card deck...</p>
                        </div>
                    </div>
                    <div className="w-full bg-[var(--bg-secondary)] rounded-full h-2 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-500 transition-all duration-500 ease-out"
                            style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-[var(--text-muted)] mt-2">
                        {LOADING_STEPS.map((step, idx) => (
                            <span
                                key={idx}
                                className={`transition-colors ${idx <= loadingStep ? 'text-purple-400' : ''}`}
                            >
                                {idx <= loadingStep ? '✓' : '○'}
                            </span>
                        ))}
                    </div>
                </Card>
            )}

            {/* Results Section */}
            {result && (
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
                                                const ownedQty = checkOwnership(card.name);
                                                const isOwned = ownedQty > 0 || card.isCommander;
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
                                    {result.deck.cards.reduce((sum, c) => checkOwnership(c.name) > 0 ? sum + c.quantity : sum, 0)} / {result.deck.cards.reduce((sum, c) => sum + (c.quantity || 1), 0)}
                                </div>
                                <p className="text-sm text-[var(--text-muted)]">Cards owned</p>
                            </Card>

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
                                            {result.deck.cards.reduce((sum, c) => checkOwnership(c.name) === 0 ? sum + (c.quantity || 1) : sum, 0)}
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
                                    <div className="flex justify-between items-center bg-[var(--bg-secondary)] p-2 rounded border border-[var(--border)]">
                                        <span className="text-xs">TCGPlayer Market</span>
                                        <span className="font-mono text-sm text-green-400">
                                            ${result.deck.cards.reduce((sum, c) => sum + (parseFloat(c.tcgPrice) || 0) * (c.quantity || 1), 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center bg-[var(--bg-secondary)] p-2 rounded border border-[var(--border)]">
                                        <span className="text-xs">Card Kingdom</span>
                                        <span className="font-mono text-sm text-blue-400">
                                            ${result.deck.cards.reduce((sum, c) => sum + (parseFloat(c.ckPrice) || 0) * (c.quantity || 1), 0).toFixed(2)}
                                        </span>
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
            )}
        </div>
    );
}
