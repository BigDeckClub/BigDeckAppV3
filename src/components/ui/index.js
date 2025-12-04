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
