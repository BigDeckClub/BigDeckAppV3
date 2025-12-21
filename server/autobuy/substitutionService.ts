/**
 * Substitution Service
 * 
 * Manages substitution groups for cards. Cards in the same group are considered
 * interchangeable for demand purposes - if one card is scarce but another in the
 * group is available, the scarce card's substitutability score increases (less urgent).
 * 
 * This helps optimize inventory by recognizing that Sol Ring and Mana Crypt serve
 * similar deckbuilding purposes, so having either satisfies some demand pressure.
 */

/**
 * Base SubstitutionGroup type (matches ipsCalculator.ts)
 * Defined locally to avoid import issues with different module resolutions
 */
export interface SubstitutionGroup {
    groupId: string;
    name: string;
    cards: string[];  // cardIds
}

/**
 * Database response type for substitution group queries
 */
interface DbSubstitutionGroup {
    id: number;
    name: string;
    description: string | null;
    created_at: Date;
    updated_at: Date;
}

interface DbSubstitutionGroupCard {
    id: number;
    group_id: number;
    scryfall_id: string;
    card_name: string | null;
    added_at: Date;
}

/**
 * Extended SubstitutionGroup with database metadata
 */
export interface SubstitutionGroupWithMeta extends SubstitutionGroup {
    id: number;
    description?: string;
    createdAt: Date;
    cardDetails: Array<{
        scryfallId: string;
        cardName?: string;
    }>;
}

/**
 * Database interface for type safety
 */
interface Database {
    query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }>;
}

/**
 * Get all substitution groups with their associated cards
 */
export async function getSubstitutionGroups(db: Database): Promise<SubstitutionGroupWithMeta[]> {
    // Fetch all groups
    const groupsResult = await db.query<DbSubstitutionGroup>(
        `SELECT id, name, description, created_at, updated_at
         FROM substitution_groups
         ORDER BY name ASC`
    );

    // Fetch all group cards
    const cardsResult = await db.query<DbSubstitutionGroupCard>(
        `SELECT id, group_id, scryfall_id, card_name, added_at
         FROM substitution_group_cards
         ORDER BY group_id, card_name ASC`
    );

    // Build a map of group_id -> cards for efficient lookup
    const cardsByGroup = new Map<number, DbSubstitutionGroupCard[]>();
    for (const card of cardsResult.rows) {
        const existing = cardsByGroup.get(card.group_id) || [];
        existing.push(card);
        cardsByGroup.set(card.group_id, existing);
    }

    // Assemble the response
    return groupsResult.rows.map(group => {
        const groupCards = cardsByGroup.get(group.id) || [];
        return {
            groupId: String(group.id),
            id: group.id,
            name: group.name,
            description: group.description || undefined,
            createdAt: group.created_at,
            cards: groupCards.map(c => c.scryfall_id),
            cardDetails: groupCards.map(c => ({
                scryfallId: c.scryfall_id,
                cardName: c.card_name || undefined,
            })),
        };
    });
}

/**
 * Get substitution groups in the simple format needed by IPS Calculator
 */
export async function getSubstitutionGroupsForIPS(db: Database): Promise<SubstitutionGroup[]> {
    const groups = await getSubstitutionGroups(db);
    return groups.map(g => ({
        groupId: g.groupId,
        name: g.name,
        cards: g.cards,
    }));
}

/**
 * Find which substitution group a card belongs to
 * Returns null if the card is not in any group
 */
export async function getGroupForCard(
    db: Database,
    cardId: string
): Promise<SubstitutionGroupWithMeta | null> {
    // First find the card's group_id
    const cardResult = await db.query<DbSubstitutionGroupCard>(
        `SELECT group_id FROM substitution_group_cards WHERE scryfall_id = $1`,
        [cardId]
    );

    if (cardResult.rows.length === 0) {
        return null;
    }

    const groupId = cardResult.rows[0].group_id;

    // Fetch the full group with all cards
    const groupResult = await db.query<DbSubstitutionGroup>(
        `SELECT id, name, description, created_at, updated_at
         FROM substitution_groups
         WHERE id = $1`,
        [groupId]
    );

    if (groupResult.rows.length === 0) {
        return null;
    }

    const group = groupResult.rows[0];

    // Fetch all cards in this group
    const cardsResult = await db.query<DbSubstitutionGroupCard>(
        `SELECT id, group_id, scryfall_id, card_name, added_at
         FROM substitution_group_cards
         WHERE group_id = $1
         ORDER BY card_name ASC`,
        [groupId]
    );

    return {
        groupId: String(group.id),
        id: group.id,
        name: group.name,
        description: group.description || undefined,
        createdAt: group.created_at,
        cards: cardsResult.rows.map(c => c.scryfall_id),
        cardDetails: cardsResult.rows.map(c => ({
            scryfallId: c.scryfall_id,
            cardName: c.card_name || undefined,
        })),
    };
}

/**
 * Create a new substitution group with initial cards
 */
export async function createGroup(
    db: Database,
    name: string,
    cardIds: Array<{ scryfallId: string; cardName?: string }>,
    description?: string
): Promise<SubstitutionGroupWithMeta> {
    // Check for duplicate card IDs already in other groups
    if (cardIds.length > 0) {
        const existingCards = await db.query<{ scryfall_id: string; group_name: string }>(
            `SELECT sgc.scryfall_id, sg.name as group_name
             FROM substitution_group_cards sgc
             JOIN substitution_groups sg ON sgc.group_id = sg.id
             WHERE sgc.scryfall_id = ANY($1)`,
            [cardIds.map(c => c.scryfallId)]
        );

        if (existingCards.rows.length > 0) {
            const conflicts = existingCards.rows.map(
                r => `${r.scryfall_id} (in "${r.group_name}")`
            );
            throw new Error(
                `Cards already in other groups: ${conflicts.join(', ')}`
            );
        }
    }

    // Create the group
    const groupResult = await db.query<DbSubstitutionGroup>(
        `INSERT INTO substitution_groups (name, description)
         VALUES ($1, $2)
         RETURNING id, name, description, created_at, updated_at`,
        [name, description || null]
    );

    const group = groupResult.rows[0];

    // Insert all cards
    if (cardIds.length > 0) {
        const values: any[] = [];
        const placeholders: string[] = [];

        cardIds.forEach((card, i) => {
            const offset = i * 3;
            placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3})`);
            values.push(group.id, card.scryfallId, card.cardName || null);
        });

        await db.query(
            `INSERT INTO substitution_group_cards (group_id, scryfall_id, card_name)
             VALUES ${placeholders.join(', ')}`,
            values
        );
    }

    return {
        groupId: String(group.id),
        id: group.id,
        name: group.name,
        description: group.description || undefined,
        createdAt: group.created_at,
        cards: cardIds.map(c => c.scryfallId),
        cardDetails: cardIds.map(c => ({
            scryfallId: c.scryfallId,
            cardName: c.cardName,
        })),
    };
}

/**
 * Add a card to an existing substitution group
 */
export async function addCardToGroup(
    db: Database,
    groupId: number,
    cardId: string,
    cardName?: string
): Promise<SubstitutionGroupWithMeta> {
    // Check if the group exists
    const groupResult = await db.query<DbSubstitutionGroup>(
        `SELECT id, name, description, created_at, updated_at
         FROM substitution_groups
         WHERE id = $1`,
        [groupId]
    );

    if (groupResult.rows.length === 0) {
        throw new Error(`Group with id ${groupId} not found`);
    }

    // Check if the card is already in another group
    const existingCard = await db.query<{ scryfall_id: string; group_id: number; group_name: string }>(
        `SELECT sgc.scryfall_id, sgc.group_id, sg.name as group_name
         FROM substitution_group_cards sgc
         JOIN substitution_groups sg ON sgc.group_id = sg.id
         WHERE sgc.scryfall_id = $1`,
        [cardId]
    );

    if (existingCard.rows.length > 0) {
        const existing = existingCard.rows[0];
        if (existing.group_id === groupId) {
            throw new Error(`Card ${cardId} is already in this group`);
        }
        throw new Error(
            `Card ${cardId} is already in group "${existing.group_name}"`
        );
    }

    // Add the card
    await db.query(
        `INSERT INTO substitution_group_cards (group_id, scryfall_id, card_name)
         VALUES ($1, $2, $3)`,
        [groupId, cardId, cardName || null]
    );

    // Return the updated group
    const group = groupResult.rows[0];
    const cardsResult = await db.query<DbSubstitutionGroupCard>(
        `SELECT id, group_id, scryfall_id, card_name, added_at
         FROM substitution_group_cards
         WHERE group_id = $1
         ORDER BY card_name ASC`,
        [groupId]
    );

    return {
        groupId: String(group.id),
        id: group.id,
        name: group.name,
        description: group.description || undefined,
        createdAt: group.created_at,
        cards: cardsResult.rows.map(c => c.scryfall_id),
        cardDetails: cardsResult.rows.map(c => ({
            scryfallId: c.scryfall_id,
            cardName: c.card_name || undefined,
        })),
    };
}

/**
 * Remove a card from its substitution group
 */
export async function removeCardFromGroup(
    db: Database,
    cardId: string
): Promise<boolean> {
    const result = await db.query(
        `DELETE FROM substitution_group_cards WHERE scryfall_id = $1`,
        [cardId]
    );

    // PostgreSQL returns rowCount on the result
    return (result as any).rowCount > 0;
}

/**
 * Delete a substitution group and all its card associations
 */
export async function deleteGroup(db: Database, groupId: number): Promise<boolean> {
    const result = await db.query(
        `DELETE FROM substitution_groups WHERE id = $1`,
        [groupId]
    );

    return (result as any).rowCount > 0;
}

/**
 * Update a substitution group's metadata
 */
export async function updateGroup(
    db: Database,
    groupId: number,
    updates: { name?: string; description?: string }
): Promise<SubstitutionGroupWithMeta | null> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        values.push(updates.name);
    }

    if (updates.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(updates.description);
    }

    if (setClauses.length === 0) {
        // No updates to make, just return the current group
        const groups = await getSubstitutionGroups(db);
        return groups.find(g => g.id === groupId) || null;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(groupId);

    const result = await db.query<DbSubstitutionGroup>(
        `UPDATE substitution_groups
         SET ${setClauses.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, name, description, created_at, updated_at`,
        values
    );

    if (result.rows.length === 0) {
        return null;
    }

    const group = result.rows[0];
    const cardsResult = await db.query<DbSubstitutionGroupCard>(
        `SELECT id, group_id, scryfall_id, card_name, added_at
         FROM substitution_group_cards
         WHERE group_id = $1
         ORDER BY card_name ASC`,
        [groupId]
    );

    return {
        groupId: String(group.id),
        id: group.id,
        name: group.name,
        description: group.description || undefined,
        createdAt: group.created_at,
        cards: cardsResult.rows.map(c => c.scryfall_id),
        cardDetails: cardsResult.rows.map(c => ({
            scryfallId: c.scryfall_id,
            cardName: c.card_name || undefined,
        })),
    };
}

export default {
    getSubstitutionGroups,
    getSubstitutionGroupsForIPS,
    getGroupForCard,
    createGroup,
    addCardToGroup,
    removeCardFromGroup,
    deleteGroup,
    updateGroup,
};
