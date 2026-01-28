# Daoli2026 - Antigravity 编辑器

一个现代化的代码编辑器界面，集成了 Supabase 数据库功能。

## ✨ 功能特性

- 🎨 **精美的代码编辑器界面** - 支持繁体中文的现代编辑器 UI
- 📁 **文件浏览器** - 可视化的文件管理系统
- 🎯 **语法高亮** - 支持 JavaScript、CSS、Markdown 等多种语言
- 🗄️ **Supabase 集成** - 完整的数据库 CRUD 操作支持
- ⚡ **实时数据同步** - 支持实时数据库订阅功能

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/secrects2/Daoli2026.git
cd Daoli2026
```

### 2. 配置 Supabase

1. 访问 [Supabase](https://supabase.com) 并创建项目
2. 复制 `.env.example` 为 `.env`
3. 在 `.env` 中填入您的 Supabase 凭据：
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_anon_key
   ```
4. 更新 `supabase-config.js` 中的配置

### 3. 运行项目

直接在浏览器中打开以下文件：

- **编辑器界面**：`index.html`
- **Supabase 测试**：`supabase-demo.html`

## 📁 项目结构

```
Daoli2026/
├── index.html              # 主编辑器界面
├── script.js               # 编辑器逻辑
├── style.css               # 样式文件
├── supabase-config.js      # Supabase 配置和工具函数
├── supabase-demo.html      # Supabase 功能测试页面
├── .env.example            # 环境变量示例
├── .gitignore              # Git 忽略配置
└── README.md               # 项目说明
```

## 🛠️ Supabase 功能

项目提供了完整的数据库操作工具：

### 初始化
```javascript
const supabaseClient = window.supabaseUtils.initSupabase();
```

### 查询数据
```javascript
const data = await window.supabaseUtils.fetchData('table_name');
```

### 插入数据
```javascript
const newData = await window.supabaseUtils.insertData('table_name', {
    column1: 'value1',
    column2: 'value2'
});
```

### 更新数据
```javascript
const updated = await window.supabaseUtils.updateData('table_name', id, {
    column1: 'new_value'
});
```

### 删除数据
```javascript
const deleted = await window.supabaseUtils.deleteData('table_name', id);
```

### 实时订阅
```javascript
const channel = window.supabaseUtils.subscribeToChanges('table_name', (payload) => {
    console.log('数据变化：', payload);
});
```

## 🎨 编辑器特性

- ✅ 支持繁体中文界面
- ✅ 行号显示
- ✅ 多标签页支持
- ✅ 文件树导航
- ✅ 状态栏信息
- ✅ 代码语法高亮

## 🧪 测试

打开 `supabase-demo.html` 可以：
- 测试 Supabase 连接
- 查看数据库内容
- 插入示例数据
- 实时验证操作结果

## 📝 数据库设置

在 Supabase Dashboard 中创建示例表：

```sql
CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用实时功能
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
```

## 🔒 安全提醒

- ⚠️ 不要将包含真实 API Key 的 `.env` 文件提交到 Git
- ⚠️ 使用 Row Level Security (RLS) 保护您的数据
- ⚠️ 在生产环境中使用环境变量管理敏感信息

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**由 Antigravity AI 助手创建** 🚀
