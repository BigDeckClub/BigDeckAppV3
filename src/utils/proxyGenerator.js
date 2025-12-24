/**
 * Proxy Card Generator - Creates printable PDF proxies with Scryfall data
 *
 * This module generates print-ready Magic: The Gathering proxy cards.
 * Card data (name, type, mana cost, oracle text) is fetched from Scryfall.
 * Artwork templates are provided based on card category/type.
 *
 * @module utils/proxyGenerator
 */

import jsPDF from 'jspdf';
import { EXTERNAL_APIS } from '../config/api';

// Dimensions (in mm)
const PAGE_WIDTH = 215.9; // Letter width
const PAGE_HEIGHT = 279.4; // Letter height
const CARD_WIDTH = 63.5; // Standard Magic card width (approx 2.5 inches)
const CARD_HEIGHT = 88.9; // Standard Magic card height (approx 3.5 inches)
const MARGIN_X = (PAGE_WIDTH - (CARD_WIDTH * 3)) / 2; // Center horizontally
const MARGIN_Y = (PAGE_HEIGHT - (CARD_HEIGHT * 3)) / 2; // Center vertically

// Colors
const COLORS = {
    BLACK: '#000000',
    WHITE: '#FFFFFF',
    MANA_GREY: '#333333',
    FRAME_BG: '#E0E0E0', // Light grey for frame background (simulating card stock)
    TEXT_BOX_BG: '#Fcfcfc', // Slightly off-white for text box
    BORDER: '#111111' // Dark border
};

// Artwork template paths (served from public/templates or CDN)
const TEMPLATE_BASE_PATH = '/templates/card-art';

/**
 * Map of card types to their artwork template paths
 */
const CATEGORY_TEMPLATES = {
    creature: `${TEMPLATE_BASE_PATH}/creature.jpg`,
    instant: `${TEMPLATE_BASE_PATH}/instant.jpg`,
    sorcery: `${TEMPLATE_BASE_PATH}/sorcery.jpg`,
    artifact: `${TEMPLATE_BASE_PATH}/artifact.jpg`,
    enchantment: `${TEMPLATE_BASE_PATH}/enchantment.jpg`,
    planeswalker: `${TEMPLATE_BASE_PATH}/planeswalker.jpg`,
    land: `${TEMPLATE_BASE_PATH}/land.jpg`,
    battle: `${TEMPLATE_BASE_PATH}/battle.jpg`,
    default: `${TEMPLATE_BASE_PATH}/default.jpg`
};

const PREMIUM_TEMPLATES = {};

/**
 * Determine card category from type line
 */
function getCardCategory(typeLine) {
    if (!typeLine) return 'default';
    const lowerType = typeLine.toLowerCase();
    if (lowerType.includes('creature')) return 'creature';
    if (lowerType.includes('planeswalker')) return 'planeswalker';
    if (lowerType.includes('battle')) return 'battle';
    if (lowerType.includes('instant')) return 'instant';
    if (lowerType.includes('sorcery')) return 'sorcery';
    if (lowerType.includes('artifact')) return 'artifact';
    if (lowerType.includes('enchantment')) return 'enchantment';
    if (lowerType.includes('land')) return 'land';
    return 'default';
}

/**
 * Get artwork template path for a card
 */
function getArtworkTemplate(typeLine, templateStyle = null) {
    const category = getCardCategory(typeLine);
    if (templateStyle && PREMIUM_TEMPLATES[templateStyle]) {
        return PREMIUM_TEMPLATES[templateStyle][category] || PREMIUM_TEMPLATES[templateStyle].default || CATEGORY_TEMPLATES[category];
    }
    return CATEGORY_TEMPLATES[category] || CATEGORY_TEMPLATES.default;
}

/**
 * Fetch card data from Scryfall API
 * Handles Split cards and DFCs by returning an array of faces.
 */
async function fetchCardFromScryfall(cardName) {
    try {
        // Handle "Card Name // Other Name" format from deck lists
        const cleanName = cardName.split(' // ')[0];

        let card;
        const response = await fetch(
            `${EXTERNAL_APIS.SCRYFALL}/cards/named?exact=${encodeURIComponent(cleanName)}`
        );

        if (!response.ok) {
            // Try fuzzy search if exact fails
            const fuzzyResponse = await fetch(
                `${EXTERNAL_APIS.SCRYFALL}/cards/named?fuzzy=${encodeURIComponent(cleanName)}`
            );
            if (!fuzzyResponse.ok) throw new Error(`Card not found: ${cardName}`);
            card = await fuzzyResponse.json();
        } else {
            card = await response.json();
        }

        // Handle Card Faces (Split, MDFC, Transform, etc.)
        // Return an array of "printable card objects"
        if (card.card_faces && card.card_faces.length > 0) {
            return card.card_faces.map(face => ({
                name: face.name,
                type_line: face.type_line,
                mana_cost: face.mana_cost || '',
                oracle_text: face.oracle_text || '',
                power: face.power,
                toughness: face.toughness,
                // Use face image if available, else fallback to root image
                // Note: Some DFCs have images on faces, Split cards often have image on root.
                image_uris: face.image_uris || card.image_uris
            }));
        }

        // Standard single-faced card
        return [{
            name: card.name,
            type_line: card.type_line,
            mana_cost: card.mana_cost || '',
            oracle_text: card.oracle_text || '',
            power: card.power,
            toughness: card.toughness,
            image_uris: card.image_uris
        }];

    } catch (error) {
        console.error(`Failed to fetch card "${cardName}" from Scryfall:`, error);
        return [{
            name: cardName,
            type_line: 'Unknown',
            mana_cost: '',
            oracle_text: 'Could not fetch card data.',
            image_uris: null
        }];
    }
}

/**
 * Generate a printable PDF of proxy cards
 */
export async function generateProxyPDF(deckList, options = {}) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
    });

    let xIndex = 0;
    let yIndex = 0;

    // Flatten deck list
    const allCards = [];
    for (const cardEntry of deckList) {
        const qty = parseInt(cardEntry.quantity) || 1;
        const cardFaces = await fetchCardFromScryfall(cardEntry.name);

        for (let i = 0; i < qty; i++) {
            // For each quantity, add ALL faces (front and back/split)
            for (const faceData of cardFaces) {
                const artworkTemplate = getArtworkTemplate(faceData.type_line, options.templateStyle);
                allCards.push({
                    ...faceData,
                    artworkTemplate
                });
            }
        }
    }

    // Draw cards
    for (let i = 0; i < allCards.length; i++) {
        const card = allCards[i];
        const xPos = MARGIN_X + (xIndex * CARD_WIDTH);
        const yPos = MARGIN_Y + (yIndex * CARD_HEIGHT);

        await drawCard(doc, card, xPos, yPos);

        xIndex++;
        if (xIndex >= 3) {
            xIndex = 0;
            yIndex++;
        }

        if (yIndex >= 3) {
            if (i < allCards.length - 1) {
                doc.addPage();
                xIndex = 0;
                yIndex = 0;
            }
        }
    }

    doc.save('bigdeck-proxies.pdf');
}

/**
 * Draw a single card on the PDF with improved layout
 */
async function drawCard(doc, card, x, y) {
    // Layout Constants (mm)
    const BORDER_WIDTH = 3;
    const TITLE_HEIGHT = 6.5;
    const TYPE_HEIGHT = 6;
    const ART_HEIGHT = 44; // Remaining top half
    const TEXT_BOX_TOP = BORDER_WIDTH + TITLE_HEIGHT + ART_HEIGHT + TYPE_HEIGHT;
    const INNER_WIDTH = CARD_WIDTH - (BORDER_WIDTH * 2);

    // -- 1. Card Frame & Background --
    // Black border/cut line
    doc.setFillColor(0, 0, 0); // Black
    doc.rect(x, y, CARD_WIDTH, CARD_HEIGHT, 'F');

    // Card "Content" Background (the colored border area, simplified to grey/frame color)
    doc.setFillColor(200, 200, 200);
    doc.rect(x + 2, y + 2, CARD_WIDTH - 4, CARD_HEIGHT - 4, 'F');

    // -- 2. Title Bar --
    // Background
    doc.setLineWidth(0.3);
    doc.setDrawColor(180, 180, 180); // Bevel effect outline
    doc.setFillColor(250, 250, 250); // Almost white
    doc.roundedRect(x + BORDER_WIDTH, y + BORDER_WIDTH, INNER_WIDTH, TITLE_HEIGHT, 1, 1, 'FD');

    // Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.BLACK);
    doc.text(truncate(card.name, 35), x + BORDER_WIDTH + 1, y + BORDER_WIDTH + 4.5);

    // Mana Cost
    if (card.mana_cost) {
        doc.setFont('courier', 'bold'); // Monospace for symbols looks slightly better than variable
        doc.setFontSize(9);
        doc.setTextColor(COLORS.MANA_GREY);
        // Strip braces for clean text: "{1}{U}" -> "1U"
        const cleanMana = card.mana_cost.replace(/[{}]/g, '');
        doc.text(cleanMana, x + CARD_WIDTH - BORDER_WIDTH - 1, y + BORDER_WIDTH + 4.5, { align: 'right' });
    }

    // -- 3. Artwork --
    const artX = x + BORDER_WIDTH;
    const artY = y + BORDER_WIDTH + TITLE_HEIGHT + 0.5; // Small gap

    // Draw art placeholder background
    doc.setFillColor(150, 150, 150);
    doc.rect(artX, artY, INNER_WIDTH, ART_HEIGHT, 'F');

    if (card.artworkTemplate) {
        try {
            const artworkData = await loadImage(card.artworkTemplate);
            doc.addImage(artworkData, 'JPEG', artX, artY, INNER_WIDTH, ART_HEIGHT);
        } catch (err) {
            drawPlaceholderArt(doc, artX, artY, INNER_WIDTH, ART_HEIGHT, getCardCategory(card.type_line));
        }
    } else {
        drawPlaceholderArt(doc, artX, artY, INNER_WIDTH, ART_HEIGHT, getCardCategory(card.type_line));
    }

    // -- 4. Type Line --
    const typeY = artY + ART_HEIGHT + 0.5;
    // Background
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(160, 160, 160);
    doc.roundedRect(x + BORDER_WIDTH, typeY, INNER_WIDTH, TYPE_HEIGHT, 1, 1, 'FD');

    // Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(COLORS.BLACK);
    doc.text(truncate(card.type_line || '', 40), x + BORDER_WIDTH + 1, typeY + 4.2);

    // -- 5. Text Box --
    const textBoxY = typeY + TYPE_HEIGHT + 0.5;
    const textBoxHeight = (y + CARD_HEIGHT - BORDER_WIDTH) - textBoxY;

    // Background
    doc.setFillColor(252, 252, 252); // Text box often lighter
    doc.setDrawColor(180, 180, 180);
    doc.rect(x + BORDER_WIDTH, textBoxY, INNER_WIDTH, textBoxHeight, 'FD');

    // Oracle Text
    if (card.oracle_text) {
        doc.setFont('times', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(COLORS.BLACK);

        // Auto-scale text if too long?
        let fontSize = 8;
        if (card.oracle_text.length > 250) fontSize = 7;
        if (card.oracle_text.length > 350) fontSize = 6.5;
        doc.setFontSize(fontSize);

        const splitText = doc.splitTextToSize(card.oracle_text, INNER_WIDTH - 4);
        doc.text(splitText, x + BORDER_WIDTH + 2, textBoxY + 4);
    }

    // -- 6. Power / Toughness (Creatures/Vehicles) --
    if (card.power && card.toughness) {
        const ptBoxWidth = 14;
        const ptBoxHeight = 6;
        const ptX = x + CARD_WIDTH - BORDER_WIDTH - ptBoxWidth - 1;
        const ptY = y + CARD_HEIGHT - BORDER_WIDTH - ptBoxHeight - 1;

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.4);
        doc.roundedRect(ptX, ptY, ptBoxWidth, ptBoxHeight, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(COLORS.BLACK);
        doc.text(`${card.power}/${card.toughness}`, ptX + (ptBoxWidth / 2), ptY + 4.5, { align: 'center' });
    }
}

/**
 * Draw placeholder artwork
 */
function drawPlaceholderArt(doc, x, y, width, height, category) {
    doc.setFillColor(220, 220, 220);
    doc.rect(x, y, width, height, 'F');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`[${category}]`, x + width / 2, y + height / 2, { align: 'center' });
}

/**
 * Load image helpers
 */
function loadImage(source) {
    return new Promise((resolve, reject) => {
        if (source.startsWith('data:')) {
            resolve(source);
            return;
        }
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/jpeg', 0.9);
            resolve(dataURL);
        };
        img.onerror = error => reject(error);
        img.src = source;
    });
}

function truncate(str, n) {
    return (str && str.length > n) ? str.substring(0, n - 1) + '...' : (str || '');
}
