const { Client } = require('pg');
const fs = require('fs');

// 使用 IPv4 地址直接连接（绕过 DNS 问题）
// Supabase Pooler 连接
// Supabase Pooler 连接
const connectionConfig = {
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 5432,  // Session mode
    database: 'postgres',
    user: 'postgres.sonpzrmonpvsrpcjvzsb', // [User].[Project]
    password: 'iQwHJy2woUZEbmF8',
    ssl: { rejectUnauthorized: false }
};

async function executeRLS() {
    const client = new Client(connectionConfig);

    try {
        console.log('🔌 连接数据库...');
        await client.connect();
        console.log('✅ 连接成功!\n');

        // 读取 SQL 文件
        const fixFile = process.argv[2] || './scripts/fix-rls.sql';
        console.log(`📂 读取 SQL 文件: ${fixFile}`);
        const sql = fs.readFileSync(fixFile, 'utf8');

        console.log('📋 执行 RLS 策略修复...\n');

        // 分割并执行每个语句
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        let success = 0;
        let failed = 0;

        for (const stmt of statements) {
            if (stmt.length < 10) continue;

            try {
                await client.query(stmt);
                const shortStmt = stmt.substring(0, 60).replace(/\n/g, ' ');
                console.log(`✅ ${shortStmt}...`);
                success++;
            } catch (err) {
                // 忽略 "policy does not exist" 错误
                if (err.message.includes('does not exist')) {
                    console.log(`⏭️  跳过 (不存在): ${stmt.substring(0, 40)}...`);
                } else {
                    console.log(`❌ 失败: ${err.message.substring(0, 60)}`);
                    failed++;
                }
            }
        }

        console.log(`\n📊 执行结果: ${success} 成功, ${failed} 失败`);

    } catch (error) {
        console.error('❌ 连接失败:', error.message);
    } finally {
        await client.end();
        console.log('\n🔌 连接已关闭');
    }
}

executeRLS();
