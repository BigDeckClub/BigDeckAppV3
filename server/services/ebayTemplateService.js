import { pool } from '../db/pool.js';
import OpenAI from 'openai';

/**
 * Return templates for a user and type. Includes user-specific and global defaults.
 */
export async function getTemplates(userId, templateType) {
  const result = await pool.query(
    `SELECT * FROM ebay_templates WHERE template_type = $1 AND (user_id = $2 OR user_id IS NULL) ORDER BY (user_id IS NOT NULL) DESC, is_default DESC`,
    [templateType, userId]
  );
  return result.rows;
}

/**
 * Safely resolve nested keys from a context object (supports dot paths).
 */
function resolvePath(obj, path) {
  if (!path) return '';
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return '';
    cur = cur[p];
  }
  return cur == null ? '' : cur;
}

/**
 * Render template content by replacing {placeholders} with values from context.
 */
export function renderTemplateContent(templateContent, context = {}) {
  if (!templateContent) return '';
  return templateContent.replace(/\{([^}]+)\}/g, (_, key) => {
    const val = resolvePath(context, key.trim());
    if (Array.isArray(val)) return val.join(', ');
    if (val === null || val === undefined) return '';
    return String(val);
  });
}

/**
 * Optionally call OpenAI to expand/beautify a rendered template into a full description.
 */
async function generateWithAI(renderedText, context = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const messages = [
    {
      role: 'system',
      content: 'You are a helpful assistant that expands short product templates into friendly, clear eBay listing descriptions. Keep it concise, buyer-focused, and include shipping/condition highlights when available.'
    },
    {
      role: 'user',
      content: `Template:\n\n${renderedText}\n\nContext:\n${JSON.stringify(context)}\n\nReturn a polished listing description suitable for eBay.`
    }
  ];

  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    max_tokens: 800,
  });

  return completion.choices?.[0]?.message?.content || '';
}

/**
 * High-level render: accepts either a template id or raw content, builds context, renders placeholders, and optionally expands with AI.
 */
export async function renderTemplate({ userId, templateId = null, templateContent = null, deck = null, extraContext = {}, useAI = false }) {
  let content = templateContent || '';

  if (templateId) {
    const r = await pool.query(`SELECT * FROM ebay_templates WHERE id = $1 LIMIT 1`, [templateId]);
    if (r.rows.length === 0) throw new Error('Template not found');
    content = r.rows[0].template_content;
  }

  // Build rendering context
  const ctx = { ...extraContext };
  if (deck) {
    ctx.deck = deck;
    ctx.name = deck.name;
    ctx.commander = deck.commander || '';
    ctx.card_count = Array.isArray(deck.cards) ? deck.cards.length : (deck.cards ? JSON.parse(deck.cards || '[]').length : 0);
    // Top cards or sample cards
    try {
      const cards = Array.isArray(deck.cards) ? deck.cards : JSON.parse(deck.cards || '[]');
      ctx.top_cards = cards.slice(0, 5).map(c => (typeof c === 'string' ? c : c.name || '')).filter(Boolean);
    } catch (err) {
      ctx.top_cards = [];
    }
  }

  // First-pass placeholder replacement
  const rendered = renderTemplateContent(content, ctx);

  if (useAI) {
    const aiResult = await generateWithAI(rendered, ctx);
    return { rendered: aiResult, meta: { ai: true } };
  }

  return { rendered, meta: { ai: false } };
}

export default {
  getTemplates,
  renderTemplateContent,
  renderTemplate,
};
