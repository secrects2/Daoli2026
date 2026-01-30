const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sonpzrmonpvsrpcjvzsb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvbnB6cm1vbnB2c3JwY2p2enNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1ODIwNDYsImV4cCI6MjA4NTE1ODA0Nn0.YQnILyC78llzVVtg2s2hVUlBtVswC9t66nq63TUprA4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestUsers() {
    console.log('🔧 创建测试用户...\n');

    // 创建药师账号
    const pharmacistEmail = 'daoliinternational@gmail.com';
    const pharmacistPassword = 'Test123456';

    console.log(`📧 创建药师账号: ${pharmacistEmail}`);
    const { data: pharmacist, error: pharmacistError } = await supabase.auth.signUp({
        email: pharmacistEmail,
        password: pharmacistPassword,
        options: {
            data: {
                role: 'pharmacist'
            }
        }
    });

    if (pharmacistError) {
        console.log(`   ❌ 错误: ${pharmacistError.message}`);
    } else {
        console.log(`   ✅ 注册请求已发送!`);
        console.log(`   📧 User ID: ${pharmacist.user?.id || 'pending'}`);

        // 尝试插入 profile
        if (pharmacist.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: pharmacist.user.id,
                    role: 'pharmacist',
                    store_id: 'store-001'
                });

            if (profileError) {
                console.log(`   ⚠️  Profile: ${profileError.message}`);
            } else {
                console.log(`   ✅ Profile 创建成功`);
            }
        }
    }

    console.log('\n========================================');
    console.log('📋 测试账号信息：');
    console.log('========================================');
    console.log('');
    console.log('【药师账号】');
    console.log(`   邮箱: ${pharmacistEmail}`);
    console.log(`   密码: ${pharmacistPassword}`);
    console.log('');
    console.log('⚠️  请检查您的邮箱确认注册！');
    console.log('   或在 Supabase Dashboard > Auth > Users 中');
    console.log('   手动确认用户（点击用户 > Confirm email）');
    console.log('========================================');
}

createTestUsers();
