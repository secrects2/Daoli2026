/**
 * 執行 transactions 表建立 SQL
 * 使用方式: node scripts/create-transactions.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 載入環境變數
let env = {};
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                env[match[1].trim()] = match[2].trim().replace(/^["'](.*?)["']$/, '$1');
            }
        });
    }
} catch (e) {
    console.error('無法載入 .env.local:', e);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ 缺少環境變數: NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createTransactionsTable() {
    console.log('🚀 開始建立 transactions 表...\n');

    // 讀取 SQL 檔案
    const sqlPath = path.resolve(__dirname, './create-transactions-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // 分割成多個語句執行
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 找到 ${statements.length} 個 SQL 語句\n`);

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (!stmt) continue;

        // 跳過純註解
        if (stmt.split('\n').every(line => line.trim().startsWith('--') || line.trim() === '')) {
            continue;
        }

        console.log(`[${i + 1}/${statements.length}] 執行中...`);

        try {
            const { error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });

            if (error) {
                // 嘗試直接執行 (某些 Supabase 設定可能支援)
                console.log(`   ⚠️  RPC 失敗，這是正常的，請手動在 Supabase Dashboard 執行 SQL`);
            } else {
                console.log(`   ✅ 成功`);
            }
        } catch (e) {
            console.log(`   ⚠️  需要手動執行`);
        }
    }

    console.log('\n============================================');
    console.log('📋 請在 Supabase Dashboard 的 SQL Editor 中執行：');
    console.log('   scripts/create-transactions-table.sql');
    console.log('============================================\n');

    // 驗證表是否存在
    console.log('🔍 驗證 transactions 表...');
    const { data, error } = await supabase
        .from('transactions')
        .select('id')
        .limit(1);

    if (error) {
        console.log('❌ transactions 表尚未建立，請手動執行 SQL');
        console.log('   錯誤:', error.message);
    } else {
        console.log('✅ transactions 表已就緒！');
    }
}

createTransactionsTable().catch(console.error);
