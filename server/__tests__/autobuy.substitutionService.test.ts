import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getSubstitutionGroups,
    getSubstitutionGroupsForIPS,
    getGroupForCard,
    createGroup,
    addCardToGroup,
    removeCardFromGroup,
    deleteGroup,
    updateGroup,
} from '../autobuy/substitutionService';

/**
 * Mock database for testing
 * Simulates PostgreSQL query responses
 */
function createMockDb() {
    const groups: any[] = [];
    const cards: any[] = [];
    let nextGroupId = 1;
    let nextCardId = 1;

    const db = {
        groups,
        cards,
        reset() {
            groups.length = 0;
            cards.length = 0;
            nextGroupId = 1;
            nextCardId = 1;
        },
        async query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[], rowCount?: number }> {
            // Parse SQL to determine operation
            const sqlLower = sql.toLowerCase().trim();

            // SELECT from substitution_groups
            if (sqlLower.includes('select') && sqlLower.includes('from substitution_groups')) {
                if (params && params.length > 0 && sqlLower.includes('where id =')) {
                    const id = params[0];
                    return { rows: groups.filter(g => g.id === id) as T[] };
                }
                return { rows: [...groups] as T[] };
            }

            // SELECT from substitution_group_cards
            if (sqlLower.includes('select') && sqlLower.includes('from substitution_group_cards')) {
                if (params && params.length > 0) {
                    if (sqlLower.includes('where scryfall_id =')) {
                        const scryfallId = params[0];
                        return { rows: cards.filter(c => c.scryfall_id === scryfallId) as T[] };
                    }
                    if (sqlLower.includes('where group_id =')) {
                        const groupId = params[0];
                        return { rows: cards.filter(c => c.group_id === groupId) as T[] };
                    }
                    if (sqlLower.includes('any($1)')) {
                        const ids = params[0];
                        const matching = cards.filter(c => ids.includes(c.scryfall_id));
                        return {
                            rows: matching.map(c => ({
                                scryfall_id: c.scryfall_id,
                                group_name: groups.find(g => g.id === c.group_id)?.name || 'Unknown',
                                group_id: c.group_id,
                            })) as T[],
                        };
                    }
                }
                return { rows: [...cards] as T[] };
            }

            // INSERT into substitution_groups
            if (sqlLower.includes('insert into substitution_groups')) {
                const newGroup = {
                    id: nextGroupId++,
                    name: params![0],
                    description: params![1],
                    created_at: new Date(),
                    updated_at: new Date(),
                };
                groups.push(newGroup);
                return { rows: [newGroup] as T[], rowCount: 1 };
            }

            // INSERT into substitution_group_cards
            if (sqlLower.includes('insert into substitution_group_cards')) {
                // Handle bulk insert (createGroup) or single insert (addCardToGroup)
                if (params!.length === 3) {
                    // Single insert
                    const newCard = {
                        id: nextCardId++,
                        group_id: params![0],
                        scryfall_id: params![1],
                        card_name: params![2],
                        added_at: new Date(),
                    };
                    cards.push(newCard);
                    return { rows: [] as T[], rowCount: 1 };
                } else {
                    // Bulk insert - params are [group_id, scryfall_id, card_name, group_id, scryfall_id, card_name, ...]
                    for (let i = 0; i < params!.length; i += 3) {
                        const newCard = {
                            id: nextCardId++,
                            group_id: params![i],
                            scryfall_id: params![i + 1],
                            card_name: params![i + 2],
                            added_at: new Date(),
                        };
                        cards.push(newCard);
                    }
                    return { rows: [] as T[], rowCount: params!.length / 3 };
                }
            }

            // DELETE from substitution_groups
            if (sqlLower.includes('delete from substitution_groups')) {
                const id = params![0];
                const idx = groups.findIndex(g => g.id === id);
                if (idx >= 0) {
                    groups.splice(idx, 1);
                    // Also remove associated cards
                    for (let i = cards.length - 1; i >= 0; i--) {
                        if (cards[i].group_id === id) {
                            cards.splice(i, 1);
                        }
                    }
                    return { rows: [] as T[], rowCount: 1 };
                }
                return { rows: [] as T[], rowCount: 0 };
            }

            // DELETE from substitution_group_cards
            if (sqlLower.includes('delete from substitution_group_cards')) {
                const scryfallId = params![0];
                const idx = cards.findIndex(c => c.scryfall_id === scryfallId);
                if (idx >= 0) {
                    cards.splice(idx, 1);
                    return { rows: [] as T[], rowCount: 1 };
                }
                return { rows: [] as T[], rowCount: 0 };
            }

            // UPDATE substitution_groups
            if (sqlLower.includes('update substitution_groups')) {
                const groupId = params![params!.length - 1];
                const group = groups.find(g => g.id === groupId);
                if (group) {
                    // Simple update logic
                    let paramIdx = 0;
                    if (sqlLower.includes('name =')) {
                        group.name = params![paramIdx++];
                    }
                    if (sqlLower.includes('description =')) {
                        group.description = params![paramIdx++];
                    }
                    group.updated_at = new Date();
                    return { rows: [group] as T[], rowCount: 1 };
                }
                return { rows: [] as T[], rowCount: 0 };
            }

            return { rows: [] as T[], rowCount: 0 };
        },
    };

    return db;
}


describe('Substitution Service', () => {
    let mockDb: ReturnType<typeof createMockDb>;

    beforeEach(() => {
        mockDb = createMockDb();
    });

    describe('getSubstitutionGroups', () => {
        it('returns empty array when no groups exist', async () => {
            const groups = await getSubstitutionGroups(mockDb);
            expect(groups).toEqual([]);
        });

        it('returns all groups with their cards', async () => {
            // Setup test data
            mockDb.groups.push({
                id: 1,
                name: 'Mana Rocks',
                description: 'Fast mana acceleration',
                created_at: new Date('2025-01-01'),
                updated_at: new Date('2025-01-01'),
            });
            mockDb.cards.push(
                { id: 1, group_id: 1, scryfall_id: 'sol-ring', card_name: 'Sol Ring', added_at: new Date() },
                { id: 2, group_id: 1, scryfall_id: 'mana-crypt', card_name: 'Mana Crypt', added_at: new Date() }
            );

            const groups = await getSubstitutionGroups(mockDb);

            expect(groups.length).toBe(1);
            expect(groups[0].name).toBe('Mana Rocks');
            expect(groups[0].cards).toContain('sol-ring');
            expect(groups[0].cards).toContain('mana-crypt');
            expect(groups[0].cardDetails.length).toBe(2);
        });
    });

    describe('getSubstitutionGroupsForIPS', () => {
        it('returns groups in IPS-compatible format', async () => {
            mockDb.groups.push({
                id: 1,
                name: 'Mana Rocks',
                description: 'Fast mana',
                created_at: new Date(),
                updated_at: new Date(),
            });
            mockDb.cards.push(
                { id: 1, group_id: 1, scryfall_id: 'sol-ring', card_name: 'Sol Ring', added_at: new Date() }
            );

            const groups = await getSubstitutionGroupsForIPS(mockDb);

            expect(groups.length).toBe(1);
            expect(groups[0]).toHaveProperty('groupId');
            expect(groups[0]).toHaveProperty('name');
            expect(groups[0]).toHaveProperty('cards');
            // Should NOT have extended properties
            expect(groups[0]).not.toHaveProperty('cardDetails');
        });
    });

    describe('getGroupForCard', () => {
        it('returns null when card is not in any group', async () => {
            const group = await getGroupForCard(mockDb, 'unknown-card');
            expect(group).toBeNull();
        });

        it('returns the group containing the card', async () => {
            mockDb.groups.push({
                id: 1,
                name: 'Mana Rocks',
                description: null,
                created_at: new Date(),
                updated_at: new Date(),
            });
            mockDb.cards.push(
                { id: 1, group_id: 1, scryfall_id: 'sol-ring', card_name: 'Sol Ring', added_at: new Date() },
                { id: 2, group_id: 1, scryfall_id: 'mana-crypt', card_name: 'Mana Crypt', added_at: new Date() }
            );

            const group = await getGroupForCard(mockDb, 'sol-ring');

            expect(group).not.toBeNull();
            expect(group!.name).toBe('Mana Rocks');
            expect(group!.cards).toContain('sol-ring');
            expect(group!.cards).toContain('mana-crypt');
        });
    });

    describe('createGroup', () => {
        it('creates a group with no cards', async () => {
            const group = await createGroup(mockDb, 'Empty Group', [], 'A test group');

            expect(group.name).toBe('Empty Group');
            expect(group.description).toBe('A test group');
            expect(group.cards).toEqual([]);
            expect(mockDb.groups.length).toBe(1);
        });

        it('creates a group with initial cards', async () => {
            const group = await createGroup(
                mockDb,
                'Mana Rocks',
                [
                    { scryfallId: 'sol-ring', cardName: 'Sol Ring' },
                    { scryfallId: 'mana-crypt', cardName: 'Mana Crypt' },
                ],
                'Fast mana'
            );

            expect(group.name).toBe('Mana Rocks');
            expect(group.cards.length).toBe(2);
            expect(group.cards).toContain('sol-ring');
            expect(group.cards).toContain('mana-crypt');
        });

        it('throws error when cards already in other groups', async () => {
            // First create a group with sol-ring
            await createGroup(mockDb, 'Group 1', [{ scryfallId: 'sol-ring' }]);

            // Try to create another group with sol-ring
            await expect(
                createGroup(mockDb, 'Group 2', [{ scryfallId: 'sol-ring' }])
            ).rejects.toThrow(/already in/);
        });
    });

    describe('addCardToGroup', () => {
        it('adds a card to an existing group', async () => {
            mockDb.groups.push({
                id: 1,
                name: 'Mana Rocks',
                description: null,
                created_at: new Date(),
                updated_at: new Date(),
            });

            const group = await addCardToGroup(mockDb, 1, 'sol-ring', 'Sol Ring');

            expect(group.cards).toContain('sol-ring');
            expect(mockDb.cards.length).toBe(1);
        });

        it('throws error when group does not exist', async () => {
            await expect(
                addCardToGroup(mockDb, 999, 'sol-ring', 'Sol Ring')
            ).rejects.toThrow(/not found/);
        });

        it('throws error when card is already in another group', async () => {
            mockDb.groups.push(
                { id: 1, name: 'Group 1', description: null, created_at: new Date(), updated_at: new Date() },
                { id: 2, name: 'Group 2', description: null, created_at: new Date(), updated_at: new Date() }
            );
            mockDb.cards.push({
                id: 1,
                group_id: 1,
                scryfall_id: 'sol-ring',
                card_name: 'Sol Ring',
                added_at: new Date(),
            });

            await expect(
                addCardToGroup(mockDb, 2, 'sol-ring', 'Sol Ring')
            ).rejects.toThrow(/already in group/);
        });

        it('throws error when card is already in the same group', async () => {
            mockDb.groups.push({
                id: 1,
                name: 'Mana Rocks',
                description: null,
                created_at: new Date(),
                updated_at: new Date(),
            });
            mockDb.cards.push({
                id: 1,
                group_id: 1,
                scryfall_id: 'sol-ring',
                card_name: 'Sol Ring',
                added_at: new Date(),
            });

            await expect(
                addCardToGroup(mockDb, 1, 'sol-ring', 'Sol Ring')
            ).rejects.toThrow(/already in this group/);
        });
    });

    describe('removeCardFromGroup', () => {
        it('removes a card from its group', async () => {
            mockDb.cards.push({
                id: 1,
                group_id: 1,
                scryfall_id: 'sol-ring',
                card_name: 'Sol Ring',
                added_at: new Date(),
            });

            const removed = await removeCardFromGroup(mockDb, 'sol-ring');

            expect(removed).toBe(true);
            expect(mockDb.cards.length).toBe(0);
        });

        it('returns false when card is not in any group', async () => {
            const removed = await removeCardFromGroup(mockDb, 'unknown-card');
            expect(removed).toBe(false);
        });
    });

    describe('deleteGroup', () => {
        it('deletes a group and its cards', async () => {
            mockDb.groups.push({
                id: 1,
                name: 'Mana Rocks',
                description: null,
                created_at: new Date(),
                updated_at: new Date(),
            });
            mockDb.cards.push(
                { id: 1, group_id: 1, scryfall_id: 'sol-ring', card_name: 'Sol Ring', added_at: new Date() },
                { id: 2, group_id: 1, scryfall_id: 'mana-crypt', card_name: 'Mana Crypt', added_at: new Date() }
            );

            const deleted = await deleteGroup(mockDb, 1);

            expect(deleted).toBe(true);
            expect(mockDb.groups.length).toBe(0);
            expect(mockDb.cards.length).toBe(0);
        });

        it('returns false when group does not exist', async () => {
            const deleted = await deleteGroup(mockDb, 999);
            expect(deleted).toBe(false);
        });
    });

    describe('updateGroup', () => {
        it('updates group name', async () => {
            mockDb.groups.push({
                id: 1,
                name: 'Old Name',
                description: null,
                created_at: new Date(),
                updated_at: new Date(),
            });

            const group = await updateGroup(mockDb, 1, { name: 'New Name' });

            expect(group).not.toBeNull();
            expect(group!.name).toBe('New Name');
        });

        it('updates group description', async () => {
            mockDb.groups.push({
                id: 1,
                name: 'Mana Rocks',
                description: null,
                created_at: new Date(),
                updated_at: new Date(),
            });

            const group = await updateGroup(mockDb, 1, { description: 'Fast mana cards' });

            expect(group).not.toBeNull();
            expect(group!.description).toBe('Fast mana cards');
        });

        it('returns null when group does not exist', async () => {
            const group = await updateGroup(mockDb, 999, { name: 'New Name' });
            expect(group).toBeNull();
        });
    });
});

describe('Substitution Service - IPS Integration', () => {
    let mockDb: ReturnType<typeof createMockDb>;

    beforeEach(() => {
        mockDb = createMockDb();
    });

    it('provides substitution groups for IPS calculation', async () => {
        // Create groups representing functional equivalents
        mockDb.groups.push(
            { id: 1, name: 'Fast Mana', description: 'Mana rocks that cost 0-1', created_at: new Date(), updated_at: new Date() },
            { id: 2, name: 'Removal', description: 'Creature removal spells', created_at: new Date(), updated_at: new Date() }
        );
        mockDb.cards.push(
            { id: 1, group_id: 1, scryfall_id: 'sol-ring', card_name: 'Sol Ring', added_at: new Date() },
            { id: 2, group_id: 1, scryfall_id: 'mana-crypt', card_name: 'Mana Crypt', added_at: new Date() },
            { id: 3, group_id: 1, scryfall_id: 'mana-vault', card_name: 'Mana Vault', added_at: new Date() },
            { id: 4, group_id: 2, scryfall_id: 'swords', card_name: 'Swords to Plowshares', added_at: new Date() },
            { id: 5, group_id: 2, scryfall_id: 'path', card_name: 'Path to Exile', added_at: new Date() }
        );

        const groups = await getSubstitutionGroupsForIPS(mockDb);

        expect(groups.length).toBe(2);

        // Fast Mana group should have 3 cards
        const fastMana = groups.find(g => g.name === 'Fast Mana')!;
        expect(fastMana.cards.length).toBe(3);

        // Removal group should have 2 cards
        const removal = groups.find(g => g.name === 'Removal')!;
        expect(removal.cards.length).toBe(2);
    });

    it('correctly identifies card group membership', async () => {
        mockDb.groups.push({
            id: 1,
            name: 'Fast Mana',
            description: null,
            created_at: new Date(),
            updated_at: new Date(),
        });
        mockDb.cards.push(
            { id: 1, group_id: 1, scryfall_id: 'sol-ring', card_name: 'Sol Ring', added_at: new Date() },
            { id: 2, group_id: 1, scryfall_id: 'mana-crypt', card_name: 'Mana Crypt', added_at: new Date() }
        );

        // Sol Ring should be found in Fast Mana group
        const solRingGroup = await getGroupForCard(mockDb, 'sol-ring');
        expect(solRingGroup).not.toBeNull();
        expect(solRingGroup!.name).toBe('Fast Mana');

        // Mana Crypt should also be in the same group
        const manaCryptGroup = await getGroupForCard(mockDb, 'mana-crypt');
        expect(manaCryptGroup).not.toBeNull();
        expect(manaCryptGroup!.groupId).toBe(solRingGroup!.groupId);

        // Other cards should not be in any group
        const otherCard = await getGroupForCard(mockDb, 'lightning-bolt');
        expect(otherCard).toBeNull();
    });
});
