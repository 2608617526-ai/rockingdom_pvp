# 洛克王国主宠PK

一个仿《洛克王国》PVP 机制的**极简网页版在线实时宠物回合制对战游戏**。

两个浏览器用户进入网页 → 加入匹配队列 → 匹配成功 → 选择首发宠物 → 1v1 三宠物回合制战斗 → 结算胜负。

> 独立个人学习项目，仅参考经典宠物回合制 PVP 玩法机制，不涉及任何商用素材或账号系统。

---

## 目录

- [特性](#特性)
- [技术栈](#技术栈)
- [目录结构](#目录结构)
- [快速开始（本地开发）](#快速开始本地开发)
- [双浏览器联机测试](#双浏览器联机测试)
- [游戏规则](#游戏规则)
- [战斗计算公式](#战斗计算公式)
- [Socket 通信结构](#socket-通信结构)
- [实现决策记录](#实现决策记录)
- [生产环境部署](#生产环境部署)
- [未来扩展方向](#未来扩展方向)

---

## 特性

- **真正的联机对战**：服务器是游戏规则的唯一权威，客户端只负责显示、动画与收集操作。
- **1v1 三宠物回合制**：双方同时选择行动 → 服务器判定顺序 → 结算 → 同步结果。
- **三只固定宠物**：烈火战神（火）、圣水守护（水）、武斗酷猫（草）。
- **完整机制**：属性克制、物理/魔法伤害、防御减伤、技能应对（counter）、宠物被动、能量系统、切换/逃跑/认输、强制换宠、断线判负。
- **可插拔资源**：宠物立绘、音频均为占位实现，放入真实资源即可自动替换。

---

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 18 + TypeScript + Vite 5 + CSS + Socket.IO Client |
| 后端 | Node.js + TypeScript + Express + Socket.IO |
| 共享 | 共享类型 / 数值数据包 `@rockingdom/shared`（npm workspaces） |
| 构建 | tsup（服务端打包）、Vite（前端构建）、tsx（服务端热重载） |
| 进程 | PM2（生产环境） |

> 不引入数据库、不引入账号系统、不引入大型状态管理框架。房间与玩家状态全部暂存在服务端内存。

---

## 目录结构

```
rockingdom_pvp/
├── package.json               # 根工作区（npm workspaces）+ 统一脚本
├── .env.example               # 环境变量示例
├── README.md
├── scripts/
│   └── smoke.mjs              # 无头联机冒烟测试
├── shared/                    # 共享包：类型 + 数值数据（前后端唯一事实来源）
│   └── src/
│       ├── index.ts
│       ├── types.ts           # 前后端通信契约
│       ├── constants.ts       # 战斗数值常量
│       ├── logic.ts           # 共享纯函数（技能能耗计算等）
│       └── data/
│           ├── pets.ts        # 宠物数据
│           ├── skills.ts      # 技能数据
│           └── elements.ts    # 属性克制
├── server/                    # 后端（游戏权威）
│   └── src/
│       ├── index.ts           # 入口：Express + Socket.IO
│       ├── config.ts          # 环境变量配置
│       ├── socket/index.ts    # Socket 事件接线
│       ├── matchmaking/index.ts
│       ├── data/              # 数值数据（重新导出 shared）
│       ├── types/index.ts     # 服务端运行时类型
│       └── battle/
│           ├── BattleEngine.ts # 战斗引擎（行动顺序/回合结算/胜负/换宠）
│           ├── damage.ts       # 伤害计算（唯一权威）
│           ├── priority.ts     # 行动优先级/技能顺序
│           ├── effects.ts      # 技能效果/状态/防御应对
│           ├── passives.ts     # 宠物被动特性
│           ├── validation.ts   # 行动合法性校验
│           ├── state.ts        # 宠物/玩家状态构造与访问
│           └── serialize.ts    # 构建客户端状态视图
└── client/                    # 前端
    ├── public/assets/         # pets / effects / audio 占位目录
    └── src/
        ├── main.tsx / App.tsx
        ├── socket/index.ts    # Socket 单例
        ├── hooks/useGame.ts   # 全局游戏状态 hook
        ├── audio/             # 音频管理（可插拔）
        ├── data/visuals.ts    # 视觉配色
        ├── utils/format.ts
        ├── types/index.ts
        ├── components/        # PetSprite / HPBar / SkillCard / Tooltip ...
        ├── pages/             # 匹配 / 首发 / 战斗 / 结算
        └── styles/global.css
```

---

## 快速开始（本地开发）

前置要求：**Node.js 20+**（推荐 20 / 22 / 24），npm 9+。

```bash
# 1. 安装全部依赖（根目录一次装完三个工作区）
npm install

# 2. 启动（同时启动后端 + 前端，开发模式）
npm run dev
```

启动后：

- 前端（Vite）：http://localhost:5173
- 后端（Socket.IO + Express）：http://localhost:3000
- 健康检查：http://localhost:3000/health

也可以分开启动：

```bash
npm run dev:server   # 后端热重载（tsx watch）
npm run dev:client   # 前端（vite）
```

### 环境变量（可选）

开发环境默认值已内建，无需 `.env` 即可运行。如需修改：

```bash
# 后端 server/.env
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development

# 前端 client/.env
VITE_SERVER_URL=http://localhost:3000
```

---

## 双浏览器联机测试

因为这是**真正的联机游戏**，需要两个独立的浏览器上下文（两个窗口，或普通窗口 + 无痕窗口）：

1. 启动服务：`npm run dev`
2. 打开浏览器 A：访问 http://localhost:5173 → 点击「开始匹配」
3. 打开浏览器 B（建议无痕窗口，避免 sessionStorage 冲突）：访问 http://localhost:5173 → 点击「开始匹配」
4. 两个浏览器匹配成功 → 各自选择首发宠物 → 进入战斗
5. 双方选择技能 / 聚能 / 切换 / 逃跑，实时对战直到一方三只宠物全部战败。

> 提示：同一浏览器两个标签页共享 `sessionStorage`，会导致玩家身份串号。请用「普通窗口 + 无痕窗口」或两个不同浏览器测试。

### 冒烟测试（无需浏览器）

```bash
node scripts/smoke.mjs
```

会自动连接两个 Socket.IO 客户端，验证匹配、伤害公式、防御减伤、切换优先级、天洪应对、死亡强制换宠、逃跑/认输等 22 项断言。

---

## 游戏规则

### 宠物

| 宠物 | 属性 | HP | 物攻 | 物防 | 魔攻 | 魔防 | 速度 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 烈火战神 | 火 | 400 | 173 | 100 | 0 | 100 | 130 |
| 圣水守护 | 水 | 600 | 0 | 150 | 130 | 150 | 65 |
| 武斗酷猫 | 草 | 500 | 150 | 120 | 0 | 120 | 135 |

初始能量 10，最大能量 10。

### 属性克制（单向 ×2）

```
火 → 草，草 → 水，水 → 火
```

### 技能

每只宠物 5 个技能（4 个普通 + 1 个聚能）。技能数据见 `shared/src/data/skills.ts`。

- **烈火战神**：吹火、火云车、火焰护盾、山火、聚能
- **武斗酷猫**：筛管奔流、酶浓度调整、仙人掌刺击、光合作用、聚能
- **圣水守护**：润泽、水泡盾、天洪、气泡、聚能

### 行动优先级

```
逃跑(1) > 切换宠物(2) > 使用技能(3)
```

- 双方同时逃跑 → 平局。
- 双方都切换 → 速度高者先；相同则房间内先加入的玩家先。
- 双方都技能 → 见下方「技能顺序」。

### 技能顺序

1. 防御技能应对攻击技能 → 防御方先（先减伤，后结算攻击）。
2. 天洪应对状态技能 → 天洪方先。
3. 其余 → 速度高者先；相同则先加入者先。

### 回合流程

```
等待双方行动 → 校验行动 → 逃跑/切换/技能 → 判定顺序 → 依次执行 →
检查死亡 → 结算被动 → 判断胜负 → 下一回合 / 强制换宠 / 结算
```

- 若第一行动导致对方当前宠物阵亡，对方本回合剩余行动取消，进入「强制换宠」。
- 宠物阵亡后若有存活宠物，必须强制换宠；三个全部阵亡则游戏结束。

---

## 战斗计算公式

### 物理攻击

```
伤害 = 技能威力 × (攻击方物理攻击 / 防御方物理防御) × 属性克制 × 37/41
```

### 魔法攻击

```
伤害 = 技能威力 × (攻击方魔法攻击 / 防御方魔法防御) × 属性克制 × 37/41
```

> 需求中「物理攻击 / 防御方魔法攻击」为明显笔误，已修正为「物理攻击 / 防御方物理防御」。

### 额外修正（按顺序）

1. 武斗酷猫被动「下一次攻击 +20%」：`伤害 × (1 + 0.2 × 层数)`，随后清空层数。
2. 防御减伤 70%：`伤害 × 0.3`。
3. `Math.floor(...)` 向下取整，最小伤害 1。

### 示例

烈火战神「吹火」（威力 60，火）攻击武斗酷猫（物防 120，草）：

```
60 × 173/120 × 2.0 × 37/41 = 156
```

---

## Socket 通信结构

### 客户端 → 服务器

| 事件 | 载荷 | 说明 |
| --- | --- | --- |
| `session:hello` | `{ playerId }` | 建立/恢复玩家身份 |
| `queue:join` | - | 加入匹配队列 |
| `queue:leave` | - | 离开匹配队列 |
| `battle:selectStarter` | `{ petId }` | 选择首发宠物 |
| `battle:chooseAction` | `{ action }` | 提交回合行动（技能/切换/逃跑） |
| `battle:confirmSwitch` | `{ targetInstanceId }` | 强制换宠选择目标 |
| `battle:surrender` | - | 认输 |

其中 `action` 结构：

```ts
type BattleAction =
  | { type: 'SKILL'; skillId: string }
  | { type: 'SWITCH'; targetInstanceId: string }
  | { type: 'FLEE' };
```

### 服务器 → 客户端

| 事件 | 载荷 | 说明 |
| --- | --- | --- |
| `session:helloed` / `session:restored` | `{ playerId }` | 身份确认 / 重连恢复 |
| `queue:waiting` | `{ message }` | 等待对手 |
| `queue:matched` | `{ roomId, playerId, opponentName, state }` | 匹配成功 |
| `battle:state` | `BattleStateView` | 全量状态同步 |
| `battle:starterSelected` | `{ playerId }` | 某人已选首发 |
| `battle:actionReceived` | `{ playerId, action }` | 某人已提交行动 |
| `battle:turnStart` | `{ turn, state }` | 新回合开始 |
| `battle:turnResult` | `{ turn, events, state }` | 回合结算结果（动画+日志） |
| `battle:forceSwitch` | `{ playerId, state }` | 需要强制换宠 |
| `battle:gameOver` | `{ winnerId, winnerName, isDraw, state }` | 游戏结束 |
| `error` | `{ message }` | 错误提示 |

### 状态视图（BattleStateView）

以「当前查看者」视角返回，`self` 是本人，`opponent` 是对手，各自包含三只宠物实例（HP/能量/增益后的攻防/被动状态）。客户端据此渲染，不自行计算战斗结果。

---

## 实现决策记录

需求中存在少量可解释空间，按最符合整体规则、最易扩展的方式实现：

1. **烈火战神被动**：「每使用一次技能物攻 +30%」实现为**基于基础值**的线性加成（`倍率 += 0.3`，即第 n 次技能后物攻 = 基础 × (1 + 0.3n)），而非复利（×1.3 的 n 次方）。字段名 `attackBoostMultiplier` 与此一致。
2. **天洪能耗校验**：选择行动时按**当前基础能耗**（7，或已永久降为 1）校验能量是否足够；回合结算时若触发「应对状态技能」，则当回合按降耗后的 1 扣费。保证「先手触发当回合即降耗」，同时避免用 1 点能量「狙击」7 费技能。
3. **武斗酷猫被动**：仅在**实际回复能量 > 0** 时获得一层「下次攻击 +20%」标记（能量已满时聚能不产生标记）。
4. **防御技能应对**：应对的额外效果在**攻击结算之后**执行。若防御方因本次攻击阵亡，自我回复/增益跳过（不复活），但「火焰护盾」的灼烧反伤照常结算。
5. **圣水守护被动减耗**：每次技能成功使用后 `+2`，下次技能结算时 `max(0, 基础能耗 - 减耗)` 并清空。因此**第一次技能全额能耗，之后每技能 -2**（聚能本身 0 能耗，减耗会「穿过」它传递到下一次）。
6. **山火成长**：只有**火系**技能（吹火、火云车、火焰护盾）会使山火威力翻倍；「聚能」无元素属性，不触发。
7. **水泡盾增益**：按需求原文 `magicAttackMultiplier ×= 1.7`，每次成功应对攻击都乘 1.7（可叠加），并与润泽的 ×2.7 共存。
8. **天洪最低能耗**：天洪永久降耗后能耗为 1，圣水守护的被动减耗不会把它进一步扣到 0（下限 1）。

---

## 生产环境部署

最终目标是部署到 Linux 云服务器，通过 Nginx 提供前端静态文件 + 反向代理 Socket.IO 到 Node.js。

### 1. 服务器准备（Ubuntu 22.04 / 24.04）

```bash
# 安装 Node.js 20+（使用 NodeSource）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证
node -v && npm -v

# 安装 Nginx
sudo apt-get install -y nginx

# 安装 PM2
sudo npm install -g pm2
```

### 2. 上传项目

```bash
# 从本地上传（任选其一）
git clone <你的仓库地址> /var/www/pet-pvp
# 或 scp / sftp 上传整个 rockingdom_pvp 目录到 /var/www/pet-pvp
```

### 3. 安装依赖并构建

```bash
cd /var/www/pet-pvp
npm install
npm run build        # 构建前端(client/dist) + 后端(server/dist)
```

### 4. 生产环境变量

```bash
# server/.env
PORT=3000
CLIENT_ORIGIN=https://你的域名
NODE_ENV=production

# 前端构建时（client/.env，构建前生效）
VITE_SERVER_URL=https://你的域名
```

> 注意：前端 `VITE_SERVER_URL` 是**构建时**注入的，修改后需重新 `npm run build`。

### 5. 配置 Nginx

`/etc/nginx/sites-available/pet-pvp`：

```nginx
server {
    listen 80;
    server_name 你的域名.com;

    root /var/www/pet-pvp/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Socket.IO 反向代理（WebSocket 升级）
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }

    location /health {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

启用并重载：

```bash
sudo ln -s /etc/nginx/sites-available/pet-pvp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

> 本项目无 REST API，Nginx 只负责：① 静态文件；② `/socket.io/` 的 WebSocket 反向代理。`/health` 用于健康检查（可选）。

### 6. 配置域名与 HTTPS

```bash
# 域名 A 记录指向服务器公网 IP

# 使用 Certbot 申请免费 HTTPS 证书
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名.com
```

### 7. 用 PM2 启动并常驻

```bash
cd /var/www/pet-pvp
pm2 start server/dist/index.js --name pet-pvp
pm2 save                 # 保存进程列表
pm2 startup              # 生成开机自启脚本（按提示执行输出命令）
```

### 8. 常用运维命令

```bash
pm2 status               # 查看状态
pm2 logs pet-pvp         # 查看日志
pm2 restart pet-pvp      # 重启
pm2 stop pet-pvp         # 停止
pm2 reload pet-pvp       # 平滑重启（0 停机）
```

### 9. 重启服务器后恢复

PM2 配合 `pm2 save` + `pm2 startup` 会在开机时自动拉起 Node.js；Nginx 由 systemd 管理，开机自启。只需确认：

```bash
pm2 status
sudo systemctl status nginx
```

### 10. 验证部署

1. 浏览器打开 `https://你的域名`，应看到「洛克王国主宠PK」标题页。
2. 用两个浏览器（或普通+无痕）分别点击「开始匹配」，验证完整联机流程。

---

## 未来扩展方向

- **更多宠物 / 技能 / 属性**：在 `shared/src/data/` 中新增数据，并（如需要）在 `effects.ts` 补充新技能效果分支即可，无需改动前端结构。
- **真实立绘与音频**：将 `fire.png / water.png / grass.png` 放入 `client/public/assets/pets/`，音频放入 `client/public/assets/audio/`。
- **房间多开 / 观战**：扩展 `MatchmakingQueue` 为多房间、加入观战 socket。
- **天梯 / 段位**：需要引入持久化（数据库），可作为下一阶段。
- **断线重连强化**：当前已支持 10 秒宽限重连，可进一步加入「重连后补发历史回合」。
- **技能特效**：在 `client/public/assets/effects/` 预留了特效资源目录，可接入帧动画。

---

## 许可

个人学习项目，仅供学习交流使用。请勿用于商业用途或引入侵权素材。
