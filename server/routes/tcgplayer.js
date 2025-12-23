
import express from 'express';
import { authenticate } from '../middleware/index.js';
import accountService from '../services/tcgplayerAccountService.js';

const router = express.Router();

/**
 * GET /api/tcgplayer/accounts
 * List saved accounts
 */
router.get('/tcgplayer/accounts', authenticate, async (req, res) => {
    try {
        const accounts = await accountService.getAccounts(req.userId);
        res.json(accounts);
    } catch (error) {
        console.error('Failed to fetch TCGPlayer accounts:', error);
        res.status(500).json({ error: 'Failed to fetch accounts' });
    }
});

/**
 * POST /api/tcgplayer/accounts
 * Add new account
 */
router.post('/tcgplayer/accounts', authenticate, async (req, res) => {
    try {
        const { accountName, email, password } = req.body;
        if (!accountName || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const account = await accountService.addAccount(req.userId, accountName, email, password);
        res.json(account);
    } catch (error) {
        console.error('Failed to add TCGPlayer account:', error);
        res.status(500).json({ error: 'Failed to add account' });
    }
});

/**
 * DELETE /api/tcgplayer/accounts/:id
 * Remove account
 */
router.delete('/tcgplayer/accounts/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        await accountService.removeAccount(req.userId, id);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to remove TCGPlayer account:', error);
        res.status(500).json({ error: 'Failed to remove account' });
    }
});

// Alias for main automation route (optional, but automation is in autobuy right now)

export default router;
