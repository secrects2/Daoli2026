// Supabase 配置文件
// 注意：在生产环境中，请使用环境变量而不是硬编码 API Key

const SUPABASE_CONFIG = {
    // 在这里填入您的 Supabase 项目信息
    // 您可以在 Supabase Dashboard -> Settings -> API 中找到这些信息
    url: 'YOUR_SUPABASE_URL', // 例如：'https://xxxxx.supabase.co'
    anonKey: 'YOUR_SUPABASE_ANON_KEY' // 您的 anon/public key
};

// 如果您想直接使用（开发环境），请取消下面的注释并填入实际值
// const SUPABASE_CONFIG = {
//     url: 'https://sonpzrmonpvsrpcjvzsb.supabase.co',
//     anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvbnB6cm1vbnB2c3JwY2p2enNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1ODIwNDYsImV4cCI6MjA4NTE1ODA0Nn0.YQnILyC78llzVVtg2s2hVUlBtVswC9t66nq63TUprA4'
// };

// 初始化 Supabase 客户端
let supabase;

// 当页面加载完成后初始化
function initSupabase() {
    if (typeof window.supabase === 'undefined') {
        console.error('Supabase 客户端库未加载！请确保在 HTML 中引入了 Supabase CDN。');
        return null;
    }

    // 检查配置是否已设置
    if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL' || SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY') {
        console.warn('⚠️ 请先配置 SUPABASE_CONFIG 中的 URL 和 anonKey');
        console.info('📖 您可以在 Supabase Dashboard -> Settings -> API 中找到这些信息');
        return null;
    }

    supabase = window.supabase.createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.anonKey
    );

    console.log('✅ Supabase 客户端初始化成功！');
    return supabase;
}

// 示例：从表中查询数据
async function fetchData(tableName) {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*');

        if (error) throw error;

        console.log(`📊 从 ${tableName} 表获取的数据：`, data);
        return data;
    } catch (error) {
        console.error('❌ 查询错误：', error.message);
        return null;
    }
}

// 示例：插入数据
async function insertData(tableName, dataObj) {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .insert([dataObj])
            .select();

        if (error) throw error;

        console.log(`✅ 成功插入数据到 ${tableName}：`, data);
        return data;
    } catch (error) {
        console.error('❌ 插入错误：', error.message);
        return null;
    }
}

// 示例：更新数据
async function updateData(tableName, id, updates) {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;

        console.log(`✅ 成功更新 ${tableName} 中的数据：`, data);
        return data;
    } catch (error) {
        console.error('❌ 更新错误：', error.message);
        return null;
    }
}

// 示例：删除数据
async function deleteData(tableName, id) {
    try {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id);

        if (error) throw error;

        console.log(`✅ 成功从 ${tableName} 删除数据`);
        return true;
    } catch (error) {
        console.error('❌ 删除错误：', error.message);
        return false;
    }
}

// 示例：实时订阅（监听数据变化）
function subscribeToChanges(tableName, callback) {
    const channel = supabase
        .channel(`${tableName}_changes`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: tableName },
            (payload) => {
                console.log('🔔 数据变化：', payload);
                if (callback) callback(payload);
            }
        )
        .subscribe();

    console.log(`🎧 已订阅 ${tableName} 表的实时更新`);
    return channel;
}

// 导出函数供其他文件使用
window.supabaseUtils = {
    initSupabase,
    fetchData,
    insertData,
    updateData,
    deleteData,
    subscribeToChanges,
    getClient: () => supabase
};
