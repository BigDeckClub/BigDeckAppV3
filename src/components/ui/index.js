/**
 * BigDeck.app Shared UI Component Library
 * 
 * This library provides a consistent set of UI components that match
 * the application's design system featuring:
 * - Teal/cyan gradient theme
 * - Slate gradient backgrounds
 * - Glassmorphism effects
 * - Smooth transitions and hover states
 * 
 * @example
 * import { Button, Modal, Input, Card, Alert } from '../components/ui';
 * 
 * // Use in components
 * <Button variant="primary" onClick={handleClick}>Save</Button>
 * <Modal isOpen={isOpen} onClose={onClose} title="Edit Item">
 *   <Input label="Name" value={name} onChange={setName} />
 * </Modal>
 */

// Core interactive components
export { Button } from './Button';
export { Modal } from './Modal';
export { Input } from './Input';
export { Select } from './Select';

// Layout and container components
export { Card } from './Card';

// Feedback components
export { LoadingSpinner } from './LoadingSpinner';
export { FullPageSpinner } from './FullPageSpinner';
export { Alert } from './Alert';
export { EmptyState } from './EmptyState';

// Display components
export { Badge } from './Badge';
export { Skeleton, CardSkeleton, ListItemSkeleton } from './Skeleton';
export { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';

// Navigation and layout components
export { Header } from './Header';
export { CommandPalette } from './CommandPalette';
export { ColorFilterChips, ManaSymbol, ColorCombo, FilterChip } from './ColorFilterChips';

// Inventory view components
export { ViewModeToggle, VIEW_MODES } from './ViewModeToggle';
export { CardGalleryView } from './CardGalleryView';
export { CardListView } from './CardListView';
export { CardTableView } from './CardTableView';
export { FilterBar } from './FilterBar';
export { VirtualizedView } from './VirtualizedView';

// Import components
export { DropZone } from './DropZone';
export { ImportWizard } from './ImportWizard';

// AI components
export { AIChatPanel } from './AIChatPanel';

// Deck components
export { DeckCardTile } from './DeckCardTile';
export { DeckStatsPanel } from './DeckStatsPanel';
export { ManaCurveChart } from './ManaCurveChart';
export { DeckColorPie } from './DeckColorPie';

// Analytics components
export { StatsCard } from './StatsCard';
export { TrendChart } from './TrendChart';

// Settings components
export { SettingsSection, SettingsCard } from './SettingsSection';
export { Toggle, ToggleGroup, RadioToggle } from './Toggle';
