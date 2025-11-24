import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pkg from 'pg';

const { Pool } = pkg;
const app = express();

app.use(cors());
app.use(bodyParser.json());

const pool = new Pool();

// Inventory endpoints
app.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const { name, set, set_name, quantity, purchase_date, purchase_price, reorder_type, image_url } = req.body;
    const result = await pool.query(
      'INSERT INTO inventory (name, set, set_name, quantity, purchase_date, purchase_price, reorder_type, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, set, set_name, quantity, purchase_date, purchase_price, reorder_type, image_url]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding inventory:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting inventory:', err);
    res.status(500).json({ error: err.message });
  }
});

// Decklists endpoints
app.get('/api/decklists', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM decklists ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching decklists:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/decklists', async (req, res) => {
  try {
    const { name, decklist } = req.body;
    const result = await pool.query(
      'INSERT INTO decklists (name, decklist) VALUES ($1, $2) RETURNING *',
      [name, decklist]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding decklist:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/decklists/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM decklists WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting decklist:', err);
    res.status(500).json({ error: err.message });
  }
});

// Containers endpoints
app.get('/api/containers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM containers ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching containers:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/containers', async (req, res) => {
  try {
    const { name, decklist_id } = req.body;
    const result = await pool.query(
      'INSERT INTO containers (name, decklist_id) VALUES ($1, $2) RETURNING *',
      [name, decklist_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding container:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/containers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM containers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting container:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sales endpoints
app.get('/api/sales', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sales ORDER BY sold_date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sales', async (req, res) => {
  try {
    const { container_id, decklist_id, sale_price } = req.body;
    const result = await pool.query(
      'INSERT INTO sales (container_id, decklist_id, sale_price) VALUES ($1, $2, $3) RETURNING *',
      [container_id, decklist_id, sale_price]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error recording sale:', err);
    res.status(500).json({ error: err.message });
  }
});

// Settings endpoints
app.get('/api/settings/:key', async (req, res) => {
  try {
    const result = await pool.query('SELECT value FROM settings WHERE key = $1', [req.params.key]);
    if (result.rows.length > 0) {
      res.json(result.rows[0].value);
    } else {
      res.json(null);
    }
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/:key', async (req, res) => {
  try {
    const { value } = req.body;
    const result = await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2 RETURNING *',
      [req.params.key, JSON.stringify(value)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
