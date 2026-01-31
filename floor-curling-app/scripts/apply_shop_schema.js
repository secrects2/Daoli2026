const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Use direct connection string or construct from env
const connectionString = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const client = new Client({
    connectionString: connectionString,
});

async function applySchema() {
    try {
        await client.connect();
        console.log('🔌 Connected to Database');

        const sqlPath = path.join(__dirname, 'setup_shop_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📜 Applying Schema...');
        await client.query(sql);

        console.log('✅ Shop Schema Applied Successfully');
    } catch (err) {
        console.error('❌ Error applying schema:', err);
    } finally {
        await client.end();
    }
}

applySchema();
