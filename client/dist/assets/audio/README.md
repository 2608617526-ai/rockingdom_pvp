# 音频资源目录（可插拔，缺失不影响运行）

把音频文件放入对应子目录即可自动生效，文件名与 `client/src/audio/sounds.ts` 中配置一致。

```
bgm/
  lobby.mp3    # 大厅 / 匹配背景音乐
  battle.mp3   # 战斗背景音乐

sfx/
  click.mp3    # 点击按钮
  match.mp3    # 匹配成功
  attack.mp3   # 攻击
  hit.mp3      # 命中
  defense.mp3  # 防御
  switch.mp3   # 切换宠物
  energy.mp3   # 回复能量
  heal.mp3     # 回复生命
  victory.mp3  # 胜利
  defeat.mp3   # 失败
```

如果音频文件不存在，音频管理器会给出控制台告警，但不会报错、不会中断游戏。
