# 世界杯竞猜 2026 ⚽

和朋友一起预测世界杯！

## 部署步骤

### 1. 安装依赖

```bash
# 后端
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# 前端
cd frontend
npm install
npm run build
cd ..
```

### 2. 初始化数据库（仅首次）

```bash
source venv/bin/activate
python backend/init_db.py
```

### 3. 启动服务

```bash
source venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

访问 `http://your-server:8000`

### 4. 首次推送后

将 `world_cup.db` 加入 `.gitignore`，防止后续更新覆盖数据：

```bash
echo "world_cup.db" >> .gitignore
git add .gitignore
git commit -m "保护数据库不被覆盖"
```

## 管理员账号

- 用户名：`老朴宅在家`
- 密码：`songhaofeng`

## 邀请码

`302`
