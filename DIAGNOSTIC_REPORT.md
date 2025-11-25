# Database Schema Mismatch - Card Addition Error

## Error Message
```
DB Error: error: column "card_name" of relation "inventory" does not exist
    at /home/runner/workspace/server.js:730:20
```

## Issue Description
When attempting to add a card to the inventory, the application fails with a PostgreSQL column not found error. The backend code is using incorrect column names that don't match the actual database schema.

## Database Schema (Actual)
The `inventory` table has the following columns:

```
Column Name       | Data Type
------------------+---------------------------
id                | bigint
name              | character varying
set               | character varying
set_name          | character varying
quantity          | integer
purchase_price    | numeric
purchase_date     | date
scryfall_id       | character varying
image_url         | text
reorder_type      | character varying
created_at        | timestamp without time zone
```

## Current Backend Code (Incorrect)
**File:** `server.js`, Line 727-738

```javascript
app.post('/api/inventory', async (req, res) => {
  const { cardName, setCode, quantity, tcgPrice, ckPrice } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO inventory (card_name, set_code, quantity, tcg_price, ck_price) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [cardName, setCode, quantity, tcgPrice, ckPrice]
    );
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});
```

## Column Name Mismatches

| Code Uses (Wrong) | Database Has (Correct) | Status |
|-------------------|------------------------|--------|
| `card_name`       | `name`                 | ❌ Wrong |
| `set_code`        | `set`                  | ❌ Wrong |
| `tcg_price`       | `purchase_price`       | ❌ Wrong |
| `ck_price`        | (no column)            | ❌ Wrong |
| `quantity`        | `quantity`             | ✅ Correct |

## Missing Data
The code is not providing values for:
- `purchase_date` (required or needs default)
- `scryfall_id` (optional)
- `image_url` (optional)

## Request Payload Structure
Based on the code, the frontend is sending:
```json
{
  "cardName": "Lightning Bolt",
  "setCode": "M11",
  "quantity": 2,
  "tcgPrice": 1.07,
  "ckPrice": 2.29
}
```

## Expected Database Fields
The code should be mapping to:
```json
{
  "name": "Lightning Bolt",           // from cardName
  "set": "M11",                       // from setCode
  "quantity": 2,                      // from quantity
  "purchase_price": 1.07,             // from tcgPrice (or ckPrice?)
  "purchase_date": "2025-11-25",      // needs to be added
  "scryfall_id": null,                // optional
  "image_url": null                   // optional
}
```

## Questions for Diagnosis
1. Should `purchase_price` be set to `tcgPrice`, `ckPrice`, or an average?
2. Should `purchase_date` be today's date or come from the request?
3. Should `ck_price` be stored somewhere (currently no column for it)?
4. What should be the default values for `scryfall_id` and `image_url`?

## Root Cause
The SQL column names in the INSERT statement do not match the actual PostgreSQL schema. This is causing the database to reject the insert operation.
