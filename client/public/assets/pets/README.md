# 宠物立绘资源目录

将真实宠物立绘放到此目录，即可自动替换内置 SVG 占位形象：

- `fire.png`  → 烈火战神
- `water.png` → 圣水守护
- `grass.png` → 武斗酷猫

支持 PNG / JPG / WebP / SVG。文件名需与宠物 id 一致。
放入后，前端 `PetSprite` 组件会自动加载图片；若文件缺失，则回退到内置 SVG 占位形象。
