import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database connection
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: (process.env.DATABASE_URL?.includes('localhost') ||
        process.env.DATABASE_URL?.includes('srv-captain') ||
        process.env.PGSSLMODE === 'disable')
        ? false : { rejectUnauthorized: false }
});

// Auth Route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }

        // Simple auth success (user can implement JWT later if needed)
        res.json({ success: true, username: user.username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no servidor ao tentar logar' });
    }
});

// Routes
app.get('/api/declarations', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM declarations ORDER BY created_at DESC');
        // Map database fields to frontend structure
        const declarations = result.rows.map(row => ({
            id: row.id,
            number: row.number,
            date: row.date,
            city: row.city,
            recipient: row.recipient,
            equipment: row.equipment,
            sender: row.sender,
            carrier: row.carrier,
            signatureSender: row.signature_sender,
            signatureCarrier: row.signature_carrier
        }));
        res.json(declarations);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/declarations', async (req, res) => {
    const { id, number, date, city, recipient, equipment, sender, carrier, signatureSender, signatureCarrier } = req.body;
    try {
        await pool.query(
            `INSERT INTO declarations (id, number, date, city, recipient, equipment, sender, carrier, signature_sender, signature_carrier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
       signature_sender = EXCLUDED.signature_sender,
       signature_carrier = EXCLUDED.signature_carrier`,
            [id, number, date, city, JSON.stringify(recipient), JSON.stringify(equipment), JSON.stringify(sender), JSON.stringify(carrier), signatureSender, signatureCarrier]
        );
        res.status(201).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/declarations/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM declarations WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
