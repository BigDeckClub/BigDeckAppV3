# 📖 Big Deck MTG Inventory Tracker - User Guide

**Your Command Center for eBay Custom Commander Deck Sales**

Built by [BigDeckClub](https://github.com/BigDeckClub)

---

## 🚀 Quick Start

Welcome to Big Deck! Here's how to get started in 5 minutes:

1. **Create an Account** - Sign up with your email
2. **Add Your First Cards** - Use Rapid Entry to add cards to your inventory
3. **Create Folders** - Organize cards by set, purchase lot, or any system you prefer
4. **Build a Deck** - Create a decklist template for your eBay listing
5. **Reserve Cards** - Auto-fill the deck from your inventory
6. **Sell & Track** - Record sales and watch your profits grow

---

## ⚡ Adding Cards with Rapid Entry

Rapid Entry is the fastest way to add cards to your inventory.

### Basic Entry

1. Navigate to the **Inventory** tab
2. Click **Rapid Entry** to open the entry panel
3. Start typing a card name - autocomplete suggestions will appear
4. Press `Enter` to select a card
5. Fill in the details:
   - **Quantity** - How many copies
   - **Purchase Price** - What you paid per card
   - **Set** - The card's set (auto-detected or select manually)
   - **Condition** - NM, LP, MP, or HP
   - **Foil** - Check if it's foil
   - **Folder** - Where to store it
6. Press `Shift + Enter` to queue the card and start a new row
7. When done, press `Ctrl + Shift + Enter` to submit all queued cards

### 💡 Pro Tip: Quantity Parsing

Type the quantity before the card name and it auto-fills!

- `4 Lightning Bolt` → Quantity: 4, Card: Lightning Bolt
- `2 Sol Ring` → Quantity: 2, Card: Sol Ring

### 📦 Lot Mode for Bulk Purchases

Bought a collection or bulk lot? Lot Mode calculates per-card costs automatically.

1. In Rapid Entry, toggle **Lot Mode** on
2. Enter the **Total Lot Price** (what you paid for everything)
3. Add all the cards in the lot
4. Big Deck automatically calculates each card's cost based on market value proportions

**Example:** You buy a lot for $50 containing cards worth $20, $30, and $50 at market value:
- Card A ($20 market) → $10 cost assigned (20% of lot)
- Card B ($30 market) → $15 cost assigned (30% of lot)
- Card C ($50 market) → $25 cost assigned (50% of lot)

### ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
|----------|--------|
| `Enter` | Select autocomplete suggestion |
| `Shift + Enter` | Queue card & add new row |
| `Ctrl + Shift + Enter` | Submit all queued cards |
| `Escape` | Clear current entry |
| `Ctrl + D` | Duplicate current row |
| `Tab` | Move to next field |

---

## 🏗️ Building Decks for eBay Sales

Create deck templates that make listing on eBay a breeze.

### Creating a New Deck

1. Go to the **Decks** tab
2. Click **New Deck**
3. Enter:
   - **Deck Name** - Something descriptive for your listing
   - **Format** - Commander, Standard, Modern, etc.
   - **Description** - Your eBay listing description (optional)
4. Add cards to the deck manually or import from Archidekt

### Adding Cards to a Deck

**Option 1: Manual Entry**
- Click **Add Card** in the deck view
- Search and add cards one by one

**Option 2: Import from Archidekt**
- Paste an Archidekt deck URL
- Click **Import** - all cards are added instantly

**Option 3: Paste a Decklist**
- Click **Import Decklist**
- Paste a text decklist (MTGO format, Arena format, or simple "4x Card Name")
- Cards are parsed and added automatically

---

## 🔄 Using Auto-Fill

Auto-Fill is your secret weapon for reserving inventory to decks efficiently.

### How Auto-Fill Works

When you auto-fill a deck, Big Deck:
1. Looks at each card in your decklist
2. Finds available copies in your inventory
3. Reserves the **oldest/cheapest copies first** (FIFO - First In, First Out)
4. Updates reserved quantities so those cards can't be double-sold

### Auto-Fill an Entire Deck

1. Open a deck
2. Click **Auto-Fill Deck**
3. Big Deck reserves inventory cards to fill as much of the deck as possible
4. View the **Missing Cards** section to see what you still need

### Auto-Fill a Single Card

1. In a deck, find a card that shows available inventory
2. Click the **Auto-Fill** button next to that card
3. One copy is reserved from your inventory

### Viewing Reserved vs. Available

In your inventory, each card shows:
- **Total Qty** - How many you own
- **Reserved** - How many are in decks
- **Available** - How many are free to sell

---

## 🔗 Using Archidekt Sync

Keep your decks in sync with Archidekt for easy updates.

### Initial Import

1. Create a new deck or open an existing one
2. Click **Link to Archidekt**
3. Paste your Archidekt deck URL
4. Click **Import** - the deck is populated with all cards

### Syncing Changes

When you update your deck on Archidekt:

1. Open the linked deck in Big Deck
2. Click **Sync with Archidekt**
3. Big Deck fetches the latest version and shows you:
   - ➕ **Added cards** - New cards in Archidekt
   - ➖ **Removed cards** - Cards no longer in the deck
   - 🔢 **Quantity changes** - Cards with different quantities
   - 📝 **Metadata changes** - Name, format, or description updates
4. Review the changes
5. Click **Apply Changes** to update your local deck

---

## 🔍 Using the Decklist Comparison Analyzer

The Comparison Analyzer helps you optimize purchases across multiple decks.

### When to Use It

- Planning to build multiple Commander decks
- Want to find staples that go in many decks
- Need to know total cards required across all decks
- Creating a bulk purchase list

### Step-by-Step Walkthrough

1. **Go to Decks Tab** and click **Compare Decks**

2. **Select Your Decks**
   - Check the boxes next to 2 or more decks you want to analyze
   - Click **Analyze Selected**

3. **Adjust Deck Quantities**
   - Use the sliders to set how many copies of each deck you want
   - Example: Set "Mono-Red Aggro" to 3 if you plan to build 3 copies

4. **View the Analysis**
   - **Shared Cards** - Cards that appear in multiple decks (great for bulk buying)
   - **Missing Cards** - Cards you need to complete all decks
   - **Per-Deck Progress** - See completion % for each deck

5. **Sort and Filter**
   - Sort by: Missing qty, Card name, Total needed, # of decks
   - Toggle between List View and Grid View

6. **Export Your List**
   - **Copy to Clipboard** - Paste into TCGPlayer mass entry
   - **Export to CSV** - Download for spreadsheets

### Example Use Case

*You're building 5 different Commander decks for eBay. You want to know how many Sol Rings you need total.*

1. Select all 5 decks
2. Set quantities to 1 each (or more if you'll build multiples)
3. Look at the Shared Cards section
4. Sol Ring appears in all 5? You need 5 copies
5. Copy the missing list and order from TCGPlayer

---

## 💰 Recording Sales

Track your sales and know your exact profit margins.

### Selling a Deck

1. Open the deck you sold
2. Click **Sell Deck**
3. Enter:
   - **Sale Price** - What the customer paid
   - **Date** - When it sold (defaults to today)
4. Click **Confirm Sale**

Big Deck automatically:
- Calculates **COGS** from the reserved cards' purchase prices
- Computes **Profit** and **Margin %**
- Removes reserved cards from inventory
- Logs the sale in your Sales History

### Selling from a Folder

You can also sell entire folders (great for bulk lots):

1. Go to Inventory
2. Click the **...** menu on a folder
3. Select **Sell Folder**
4. Enter sale details
5. Confirm - all cards in the folder are marked as sold

### Viewing Sales History

Go to the **Sales** tab to see:
- All past sales with date, item, quantity
- COGS, Revenue, and Profit per sale
- Total revenue and profit summaries

---

## 💡 Pro Tips for eBay Sellers

### Tip 1: Use Folders for Purchase Lots
Create a folder for each collection you buy. When you sell the whole lot, you can sell the entire folder with accurate COGS.

### Tip 2: Build Template Decks
Create "template" decks for your most popular builds. Clone them when you get new inventory instead of rebuilding from scratch.

### Tip 3: Check Reorder Alerts
The Analytics tab shows cards running low. Set thresholds for your best sellers so you never miss a sale.

### Tip 4: Use the Comparison Analyzer Before Buying
Before ordering singles, run a comparison across all your deck templates. Buy the staples in bulk to save on shipping.

### Tip 5: FIFO Saves on Taxes
Auto-Fill uses FIFO (First In, First Out), reserving your oldest/cheapest inventory first. This is good for tax purposes and ensures old stock moves.

### Tip 6: Track Everything
Even small purchases add up. Use Lot Mode for collections to get accurate per-card costs, making your profit tracking precise.

---

## 🔮 Coming Soon

### Cube Draft Support
We're working on features to help you:
- Track cube card lists
- Manage draft sessions
- Record draft results

Stay tuned for updates!

---

## 🆘 Need Help?

- **Report Issues:** [GitHub Issues](https://github.com/BigDeckClub/BigDeckAppV3/issues)
- **Feature Requests:** Open an issue with the "enhancement" label

---

*Big Deck MTG Inventory Tracker - Making eBay deck selling easier, one card at a time.*
