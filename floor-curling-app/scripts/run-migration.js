const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 直接使用用户提供的连接字符串（去掉密码周围的方括号）
const connectionString = 'postgresql://postgres:iQwHJy2woUZEbmF8@db.sonpzrmonpvsrpcjvzsb.supabase.co:5432/postgres';

async function runMigration() {
    const client = new Client({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('正在连接到 Supabase 数据库...');
        await client.connect();
        console.log('✅ 数据库连接成功！\n');

        // 读取 SQL 文件
        const sqlPath = path.join(__dirname, '..', '..', 'supabase-migration.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('正在执行迁移脚本...\n');

        // 执行整个 SQL 脚本
        await client.query(sql);

        console.log('✅ 数据库迁移完成！');
        console.log('\n创建的表：');
        console.log('  - profiles (用户档案)');
        console.log('  - wallets (钱包)');
        console.log('  - equipment (装备)');
        console.log('  - inventory (背包)');
        console.log('  - matches (比赛)');
        console.log('  - match_ends (比赛回合)');

    } catch (error) {
        console.error('❌ 迁移失败:', error.message);

        if (error.message.includes('already exists')) {
            console.log('\n⚠️  某些对象已经存在，这通常是正常的。');
        }
    } finally {
        await client.end();
        console.log('\n数据库连接已关闭。');
    }
}

runMigration();
