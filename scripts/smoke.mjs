/**
 * 无头联机冒烟测试：真实走一遍 Socket.IO 流程，验证服务端权威逻辑。
 * 运行：node scripts/smoke.mjs  （需先启动 server）
 */
import { io } from 'socket.io-client';

const URL = process.env.SMOKE_URL ?? 'http://localhost:3000';
let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    console.log(`  ✘ ${name}  ${detail}`);
  }
}

function once(socket, event, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting ${event}`)), timeout);
    socket.once(event, (payload) => {
      clearTimeout(t);
      resolve(payload);
    });
  });
}

function connect(playerId) {
  return new Promise((resolve, reject) => {
    const s = io(URL, { transports: ['websocket'], forceNew: true, reconnection: false });
    s.on('connect', () => {
      s.emit('session:hello', { playerId });
      resolve(s);
    });
    s.on('connect_error', reject);
  });
}

async function matchAndStart(A, B, petA, petB) {
  const matchedA = once(A, 'queue:matched');
  const matchedB = once(B, 'queue:matched');
  A.emit('queue:join');
  B.emit('queue:join');
  await Promise.all([matchedA, matchedB]);
  const startA = once(A, 'battle:turnStart');
  const startB = once(B, 'battle:turnStart');
  A.emit('battle:selectStarter', { petId: petA });
  B.emit('battle:selectStarter', { petId: petB });
  return Promise.all([startA, startB]);
}

async function playTurn(A, B, actA, actB) {
  const rA = once(A, 'battle:turnResult');
  const rB = once(B, 'battle:turnResult');
  A.emit('battle:chooseAction', { action: actA });
  B.emit('battle:chooseAction', { action: actB });
  return Promise.all([rA, rB]);
}

async function main() {
  console.log('\n== 冒烟测试 ==\n');

  // ============ 1. 匹配 + 首发 ============
  console.log('匹配与首发');
  const PA = 'smoke-aaaaaa';
  const PB = 'smoke-bbbbbb';
  const A = await connect(PA);
  const B = await connect(PB);
  const [sa] = await matchAndStart(A, B, 'fire', 'grass');
  check('进入战斗阶段', sa.state.phase === 'BATTLE');

  // ============ 2. 伤害公式 ============
  // 烈火战神吹火 vs 武斗酷猫：60 * 173/120 * 2(火→草) * 37/41 = 156
  console.log('伤害公式（吹火 vs 草）');
  const [ra] = await playTurn(A, B, { type: 'SKILL', skillId: 'fire_blow' }, { type: 'SKILL', skillId: 'charge' });
  const dmgEvt = ra.events.find((e) => e.type === 'DAMAGE');
  check('吹火伤害 = 156', dmgEvt?.value === 156, `实际=${dmgEvt?.value}`);
  const fire1 = ra.state.self.pets.find((p) => p.petId === 'fire');
  const grass1 = ra.state.opponent.pets.find((p) => p.petId === 'grass');
  check('烈火战神能量 10→9', fire1.energy === 9, `实际=${fire1.energy}`);
  check('武斗酷猫 HP 500→344', grass1.hp === 344, `实际=${grass1.hp}`);
  check('速度：聚能(草135)先于吹火(火130)',
    ra.events.find((e) => e.type === 'ATTACK' || e.type === 'STATUS')?.description?.includes('聚能') === true);

  // ============ 3. 防御应对 ============
  // A 吹火(威力80, 物攻×1.3) vs B 酶浓度调整(减伤70% + 回20%=100)
  console.log('防御应对（吹火 vs 酶浓度调整）');
  const [ra2] = await playTurn(A, B, { type: 'SKILL', skillId: 'fire_blow' }, { type: 'SKILL', skillId: 'enzyme' });
  const dmgEvt2 = ra2.events.find((e) => e.type === 'DAMAGE');
  // 80 * 224.9/120 * 2 * 37/41 ≈ 270.6 → ×0.3 = 81
  check('减伤后吹火伤害 = 81', dmgEvt2?.value === 81, `实际=${dmgEvt2?.value}`);
  const healEvt = ra2.events.find((e) => e.type === 'HEAL');
  check('酶浓度调整回血 100', healEvt?.value === 100, `实际=${healEvt?.value}`);
  const grass2 = ra2.state.opponent.pets.find((p) => p.petId === 'grass');
  check('武斗酷猫 HP 344-81+100=363', grass2.hp === 363, `实际=${grass2.hp}`);

  // 火焰护盾（火系防御技）也应触发山火威力翻倍：两次吹火后 mult=4，火焰护盾后=8
  const [ra3] = await playTurn(A, B, { type: 'SKILL', skillId: 'fire_shield' }, { type: 'SKILL', skillId: 'charge' });
  const fire3 = ra3.state.self.pets.find((p) => p.petId === 'fire');
  check('火焰护盾触发山火威力翻倍(mult=8)', fire3.passive.mountainFireMultiplier === 8, `实际=${fire3.passive.mountainFireMultiplier}`);

  // ============ 4. 切换优先于攻击 ============
  console.log('切换优先于攻击');
  const PC = 'smoke-cccccc';
  const PD = 'smoke-dddddd';
  const C = await connect(PC);
  const D = await connect(PD);
  await matchAndStart(C, D, 'fire', 'water');
  // C 切换到草系；D 用水系气泡攻击 → 切换先执行，气泡打到新上场的草系
  const [rc] = await playTurn(C, D,
    { type: 'SWITCH', targetInstanceId: `${PC}:grass` },
    { type: 'SKILL', skillId: 'bubble' });
  const switchEvt = rc.events.find((e) => e.type === 'SWITCH');
  const atkEvt = rc.events.find((e) => e.type === 'ATTACK');
  const evtIdx = (e) => rc.events.indexOf(e);
  check('切换事件先于攻击事件', evtIdx(switchEvt) < evtIdx(atkEvt));
  const cGrass = rc.state.self.pets.find((p) => p.petId === 'grass');
  check('C 出战宠物已切换为草系', cGrass.status === 'ACTIVE');
  // 气泡：水→草 ×1，100 * 130/120 * 37/41 ≈ 97
  check('草系承伤 ≈97', cGrass.hp === 403, `实际=${cGrass.hp}`);

  // ============ 5. 天洪应对状态技能 ============
  console.log('天洪应对状态技能');
  const PE = 'smoke-eeeeee';
  const PF = 'smoke-ffffff';
  const E = await connect(PE);
  const F = await connect(PF);
  await matchAndStart(E, F, 'water', 'grass');
  const [re] = await playTurn(E, F, { type: 'SKILL', skillId: 'deluge' }, { type: 'SKILL', skillId: 'charge' });
  const firstEvt = re.events.find((e) => e.type === 'ATTACK' || e.type === 'STATUS');
  check('天洪先于聚能执行', firstEvt?.type === 'ATTACK' && firstEvt?.skillName === '天洪', `首行动=${firstEvt?.description}`);
  const waterE = re.state.self.pets.find((p) => p.petId === 'water');
  check('天洪第一次应对：永久减耗=6', waterE.passive.heavenlyFloodCostReduction === 6, `实际=${waterE.passive.heavenlyFloodCostReduction}`);
  check('天洪实际扣1能量(10→9)', waterE.energy === 9, `实际=${waterE.energy}`);

  // 天洪第二次应对：永久减耗=12，加上圣水守护通用减耗2 → 实际能耗 = max(0, 7-12-2) = 0
  const [re2] = await playTurn(E, F, { type: 'SKILL', skillId: 'deluge' }, { type: 'SKILL', skillId: 'charge' });
  const waterE2 = re2.state.self.pets.find((p) => p.petId === 'water');
  check('天洪第二次应对：永久减耗=12', waterE2.passive.heavenlyFloodCostReduction === 12, `实际=${waterE2.passive.heavenlyFloodCostReduction}`);
  check('天洪第二次实际能耗=0(9→9)', waterE2.energy === 9, `实际=${waterE2.energy}`);

  // ============ 6. 死亡 + 强制换宠 ============
  console.log('死亡与强制换宠');
  const PG = 'smoke-gggggg';
  const PH = 'smoke-hhhhhh';
  const G = await connect(PG);
  const H = await connect(PH);
  await matchAndStart(G, H, 'fire', 'grass');
  // 回合1：火云车(140) → 364 伤害，草 500→136
  await playTurn(G, H, { type: 'SKILL', skillId: 'fire_cart' }, { type: 'SKILL', skillId: 'charge' });
  // 回合2：火云车(物攻×1.3) → 473 伤害，草阵亡
  const [rg2] = await playTurn(G, H, { type: 'SKILL', skillId: 'fire_cart' }, { type: 'SKILL', skillId: 'charge' });
  check('出现死亡事件', rg2.events.some((e) => e.type === 'DEATH'));
  check('进入 FORCED_SWITCH', rg2.state.phase === 'FORCED_SWITCH', `phase=${rg2.state.phase}`);
  check('H 需要强制换宠', rg2.state.forcedSwitchPlayerIds.includes(PH));
  check('G 无需换宠', !rg2.state.forcedSwitchPlayerIds.includes(PG));

  // H 强制换宠到水系，验证回到 BATTLE
  const switchH = once(H, 'battle:switchConfirmed');
  H.emit('battle:confirmSwitch', { targetInstanceId: `${PH}:water` });
  await switchH;
  const startAfter = once(G, 'battle:turnStart');
  const startAfter2 = once(H, 'battle:turnStart');
  const [sg2] = await Promise.all([startAfter, startAfter2]);
  check('强制换宠后回到 BATTLE', sg2.state.phase === 'BATTLE');

  // ============ 7. 逃跑判负 ============
  console.log('逃跑判负');
  const PI = 'smoke-iiiiii';
  const PJ = 'smoke-jjjjjj';
  const I = await connect(PI);
  const J = await connect(PJ);
  await matchAndStart(I, J, 'fire', 'water');
  const goI = once(I, 'battle:gameOver');
  const goJ = once(J, 'battle:gameOver');
  I.emit('battle:chooseAction', { action: { type: 'FLEE' } });
  J.emit('battle:chooseAction', { action: { type: 'SKILL', skillId: 'charge' } });
  const [gi] = await Promise.all([goI, goJ]);
  check('逃跑方判负', gi.state.winnerId === PJ, `winner=${gi.state.winnerId}`);
  check('对方获胜', gi.state.winnerId !== PI);

  // ============ 8. 认输 ============
  console.log('认输');
  const PK = 'smoke-kkkkkk';
  const PL = 'smoke-llllll';
  const K = await connect(PK);
  const L = await connect(PL);
  await matchAndStart(K, L, 'fire', 'water');
  const goK = once(K, 'battle:gameOver');
  K.emit('battle:surrender');
  const gk = await goK;
  check('认输后对手获胜', gk.state.winnerId === PL);

  [A, B, C, D, E, F, G, H, I, J, K, L].forEach((s) => s.disconnect());

  console.log(`\n== 结果：通过 ${passed}，失败 ${failed} ==\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('冒烟测试异常：', e);
  process.exit(2);
});
