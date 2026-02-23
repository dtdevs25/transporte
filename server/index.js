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

// Helper for Audit Logs
const createLog = async (username, action, entity, entityId, details) => {
    try {
        await pool.query(
            'INSERT INTO audit_logs (username, action, entity, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
            [username, action, entity, entityId, details]
        );
    } catch (err) {
        console.error('Error creating log:', err);
    }
};

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

        // Return role for frontend logic
        res.json({ success: true, username: user.username, role: user.role || 'user' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no servidor ao tentar logar' });
    }
});

// Temporary Setup Route (Visit this once in browser to create admin user)
app.get('/api/setup-admin', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await pool.query(
            `INSERT INTO users (username, password, role) VALUES ($1, $2, $3)
             ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role`,
            ['admin', hashedPassword, 'master']
        );
        res.send('Usuário administrador criado/atualizado com sucesso! Agora você pode logar com admin / admin123');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao criar admin: ' + err.message);
    }
});

app.get('/api/setup-audit', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50),
                action VARCHAR(20),
                entity VARCHAR(50),
                entity_id VARCHAR(50),
                details TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
        `);
        res.send('Tabela audit_logs criada com sucesso!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao criar tabela de logs: ' + err.message);
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

        // Log the action (we assume the username comes in headers or body for now)
        const username = req.headers['x-username'] || 'desconhecido';
        await createLog(username, 'CREATE/UPDATE', 'DECLARATION', id, `Declaração Nº ${number}`);

        res.status(201).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// User Management Routes
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role, created_at FROM users ORDER BY username ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

app.get('/api/user-role/:username', async (req, res) => {
    try {
        const result = await pool.query('SELECT role FROM users WHERE username = $1', [req.params.username]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.json({ role: result.rows[0].role || 'user' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar nível de acesso' });
    }
});

app.post('/api/users', async (req, res) => {
    const { username, password, role } = req.body;
    const adminUsername = req.headers['x-username'] || 'admin';
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
            [username, hashedPassword, role || 'user']
        );
        await createLog(adminUsername, 'CREATE', 'USER', username, `Criou usuário ${username} (${role})`);
        res.status(201).json({ success: true });
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Usuário já existe' });
        }
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const adminUsername = req.headers['x-username'] || 'admin';
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        await createLog(adminUsername, 'DELETE', 'USER', req.params.id, 'Excluiu um usuário');
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir usuário' });
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
