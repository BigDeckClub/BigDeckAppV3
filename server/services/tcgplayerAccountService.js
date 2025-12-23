
import { pool } from '../db/pool.js';
import crypto from 'crypto';

/**
 * Encrypt sensitive data (password) before storing
 */
function encrypt(text) {
    if (!text) return null;
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length < 32) {
        console.warn('[TCGPlayer] ENCRYPTION_KEY not set or too short, storing password unencrypted');
        return text;
    }
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.slice(0, 32)), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data (password) when reading
 */
function decrypt(encryptedText) {
    if (!encryptedText) return null;
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length < 32 || !encryptedText.includes(':')) {
        return encryptedText; // Return as-is if not encrypted
    }
    try {
        const [ivHex, encrypted] = encryptedText.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key.slice(0, 32)), iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error('[TCGPlayer] Decryption failed:', err.message);
        return null;
    }
}

export async function addAccount(userId, accountName, email, password) {
    const encryptedPassword = encrypt(password);
    const result = await pool.query(
        `INSERT INTO tcgplayer_accounts 
         (user_id, account_name, email, encrypted_password, updated_at) 
         VALUES ($1, $2, $3, $4, NOW()) 
         RETURNING id, account_name, email, created_at`,
        [userId, accountName, email, encryptedPassword]
    );
    return result.rows[0];
}

export async function getAccounts(userId) {
    const result = await pool.query(
        `SELECT id, account_name, email, created_at, updated_at 
         FROM tcgplayer_accounts 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
    );
    return result.rows;
}

export async function getAccountCredentials(userId, accountId) {
    const result = await pool.query(
        `SELECT email, encrypted_password 
         FROM tcgplayer_accounts 
         WHERE user_id = $1 AND id = $2`,
        [userId, accountId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
        email: row.email,
        password: decrypt(row.encrypted_password)
    };
}

export async function removeAccount(userId, accountId) {
    await pool.query(
        `DELETE FROM tcgplayer_accounts WHERE user_id = $1 AND id = $2`,
        [userId, accountId]
    );
}

export default {
    addAccount,
    getAccounts,
    getAccountCredentials,
    removeAccount
};
