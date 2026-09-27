/**
 * 账号 + 历史对局 集成冒烟测试：真实走一遍注册 / 登录 / 对战 / 历史查询。
 * 运行：先启动 server，再 node scripts/smoke-auth.mjs
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

function once(socket, event, timeout = 6000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting ${event}`)), timeout);
    socket.once(event, (payload) => {
      clearTimeout(t);
      resolve(payload);
    });
  });
}

const rand6 = () => String(Math.floor(100000 + Math.random() * 899999));

async function api(path, options = {}) {
  const res = await fetch(`${URL}${path}`, options);
  return { status: res.status, body: await res.json() };
}

function post(path, body) {
  return api(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function get(path, token) {
  return api(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
}

function register(account, nickname, password = 'Aa123456!') {
  return post('/api/auth/register', { account, password, nickname, avatar: '' });
}

async function connectAs(token, label) {
  const s = io(URL, { transports: ['websocket'], forceNew: true, reconnection: false });
  await new Promise((resolve, reject) => {
    s.on('connect', resolve);
    s.on('connect_error', reject);
  });
  const playerId = `auth-${label}-${Math.random().toString(16).slice(2, 8)}`;
  s.emit('session:hello', { playerId, token });
  return s;
}

async function match(A, B) {
  const ma = once(A, 'queue:matched');
  const mb = once(B, 'queue:matched');
  A.emit('queue:join');
  B.emit('queue:join');
  return Promise.all([ma, mb]);
}

async function selectBoth(A, B) {
  const ta = once(A, 'battle:turnStart');
  const tb = once(B, 'battle:turnStart');
  A.emit('battle:selectStarter', { petId: 'fire' });
  B.emit('battle:selectStarter', { petId: 'water' });
  return Promise.all([ta, tb]);
}

async function playOneTurn(A, B) {
  const ra = once(A, 'battle:turnResult');
  const rb = once(B, 'battle:turnResult');
  A.emit('battle:chooseAction', { action: { type: 'SKILL', skillId: 'fire_blow' } });
  B.emit('battle:chooseAction', { action: { type: 'SKILL', skillId: 'charge' } });
  return Promise.all([ra, rb]);
}

// loser 认输 → winner 获胜；双方收到 gameOver（此时战绩已落库）
async function endBySurrender(winner, loser) {
  const gw = once(winner, 'battle:gameOver');
  const gl = once(loser, 'battle:gameOver');
  loser.emit('battle:surrender');
  return Promise.all([gw, gl]);
}

async function main() {
  console.log('\n== 账号 + 历史对局 冒烟测试 ==\n');

  // 生成 4 个不重复的 6 位账号
  const accounts = [];
  while (accounts.length < 4) {
    const a = rand6();
    if (!accounts.includes(a)) accounts.push(a);
  }
  const [accA, accB, accC, accD] = accounts;

  // ============ 1. 注册 ============
  console.log('注册');
  const regA = await register(accA, '玩家A');
  const regB = await register(accB, '玩家B');
  const regC = await register(accC, '玩家C');
  const regD = await register(accD, '玩家D');
  check('注册成功 A', regA.status === 200 && regA.body.success && !!regA.body.token);
  check('注册成功 B', regB.status === 200 && regB.body.success);
  check('注册成功 C', regC.status === 200 && regC.body.success);
  check('注册成功 D', regD.status === 200 && regD.body.success);

  // ============ 2. 注册校验 ============
  console.log('注册校验');
  const dup = await register(accA, '重复账号');
  check('重复账号 → 409 ACCOUNT_EXISTS', dup.status === 409 && dup.body.code === 'ACCOUNT_EXISTS', `status=${dup.status}`);
  const bad1 = await post('/api/auth/register', { account: '12345', password: 'Aa123456!', nickname: '短账号', avatar: '' });
  check('5 位账号 → 400', bad1.status === 400 && bad1.body.code === 'INVALID_ACCOUNT');
  const bad2 = await post('/api/auth/register', { account: '12345a', password: 'Aa123456!', nickname: '含字母', avatar: '' });
  check('含字母账号 → 400', bad2.status === 400);
  const weak = await register(rand6(), '弱密码', 'abc');
  check('弱密码 → 400 WEAK_PASSWORD', weak.status === 400 && weak.body.code === 'WEAK_PASSWORD');
  const badNick = await post('/api/auth/register', { account: rand6(), password: 'Aa123456!', nickname: 'x', avatar: '' });
  check('昵称过短 → 400', badNick.status === 400 && badNick.body.code === 'INVALID_NICKNAME');

  // ============ 3. 登录 ============
  console.log('登录');
  const loginA = await post('/api/auth/login', { account: accA, password: 'Aa123456!' });
  check('登录成功', loginA.status === 200 && loginA.body.success && !!loginA.body.token);
  const loginFail = await post('/api/auth/login', { account: accA, password: 'WrongPass1!' });
  check('密码错误 → 401 统一提示', loginFail.status === 401 && loginFail.body.message === '账号或密码错误');
  const loginNoSuch = await post('/api/auth/login', { account: rand6(), password: 'Aa123456!' });
  check('账号不存在 → 401 统一提示', loginNoSuch.status === 401 && loginNoSuch.body.message === '账号或密码错误');

  // 用登录后的 token（登录会把注册 token 挤下线，单会话）
  const tokenA = loginA.body.token;
  const userIdA = regA.body.user.id;

  // ============ 4. 对战（A vs B / C vs A / A vs D） ============
  console.log('对战');
  // A vs B：A 先入队（p1），B 认输 → A 胜
  const sa = await connectAs(tokenA, 'A');
  const sb = await connectAs(regB.body.token, 'B');
  await match(sa, sb);
  await selectBoth(sa, sb);
  await playOneTurn(sa, sb);
  await endBySurrender(sa, sb);
  sa.disconnect();
  sb.disconnect();

  // C vs A：C 先入队（p1），A 是 p2，A 认输 → C 胜（验证视角转换）
  const sc = await connectAs(regC.body.token, 'C');
  const sa2 = await connectAs(tokenA, 'A2');
  await match(sc, sa2);
  await selectBoth(sc, sa2);
  await endBySurrender(sc, sa2);
  sc.disconnect();
  sa2.disconnect();

  // A vs D：A 先入队，D 认输 → A 胜
  const sa3 = await connectAs(tokenA, 'A3');
  const sd = await connectAs(regD.body.token, 'D');
  await match(sa3, sd);
  await selectBoth(sa3, sd);
  await endBySurrender(sa3, sd);
  sa3.disconnect();
  sd.disconnect();

  // ============ 5. 历史对局 ============
  console.log('历史对局');
  const hist = await get('/api/battles/history', tokenA);
  check('历史返回 3 场', hist.status === 200 && hist.body.success && hist.body.battles?.length === 3, `count=${hist.body.battles?.length}`);

  const battles = hist.body.battles ?? [];
  const opps = battles.map((b) => b.opponent.nickname).sort();
  check('对手为 B/C/D（当前用户视角）', JSON.stringify(opps) === JSON.stringify(['玩家B', '玩家C', '玩家D']), JSON.stringify(opps));

  const results = {};
  for (const b of battles) results[b.opponent.nickname] = b.result;
  check('A 胜 B', results['玩家B'] === 'win', results['玩家B']);
  check('A 负 C', results['玩家C'] === 'lose', results['玩家C']);
  check('A 胜 D', results['玩家D'] === 'win', results['玩家D']);
  check('历史统计：总场次=3', hist.body.total === 3, `total=${hist.body.total}`);
  check('历史统计：胜场=2', hist.body.wins === 2, `wins=${hist.body.wins}`);

  // ============ 6. 战斗详情 / 权限 ============
  console.log('战斗详情与权限');
  const abBattle = battles.find((b) => b.opponent.nickname === '玩家B');
  const detail = await get(`/api/battles/${abBattle.id}`, tokenA);
  check('详情返回成功', detail.status === 200 && detail.body.success);
  check('详情含战斗日志', Array.isArray(detail.body.battle?.battleLog) && detail.body.battle.battleLog.length > 0);
  check('详情中 A 是参与者', detail.body.battle?.player1?.userId === userIdA || detail.body.battle?.player2?.userId === userIdA);

  const forbidden = await get(`/api/battles/${abBattle.id}`, regD.body.token);
  check('非参与者读取 → 403', forbidden.status === 403, `status=${forbidden.status}`);
  const notFound = await get('/api/battles/no-such-id', tokenA);
  check('不存在的对局 → 404', notFound.status === 404);
  const unauth = await get('/api/battles/history');
  check('未登录 → 401', unauth.status === 401);

  // ============ 7. 断线立即判负 ============
  console.log('断线立即判负');
  const sx = await connectAs(tokenA, 'X');
  const sy = await connectAs(regB.body.token, 'Y');
  await match(sx, sy);
  await selectBoth(sx, sy);
  const goY = once(sy, 'battle:gameOver');
  sx.disconnect();
  const gy = await goY;
  check('断线后对手立即获胜', gy.state.winnerId === gy.state.self.id, `winner=${gy.state.winnerId}`);
  check('结束原因为 DISCONNECT', gy.reason === 'DISCONNECT', `reason=${gy.reason}`);
  sy.disconnect();

  // ============ 8. 异地登录挤下线 ============
  console.log('异地登录挤下线');
  const sOld = await connectAs(regD.body.token, 'D-old');
  const loginD2 = await post('/api/auth/login', { account: accD, password: 'Aa123456!' });
  const kickedEvt = once(sOld, 'session:kicked');
  const sNew = await connectAs(loginD2.body.token, 'D-new');
  await kickedEvt;
  check('旧连接被挤下线', true);
  sNew.disconnect();

  // ============ 9. 异地登录迁移战斗 ============
  console.log('异地登录迁移战斗');
  const saMig = await connectAs(tokenA, 'A-mig');
  const sbMig = await connectAs(regB.body.token, 'B-mig');
  await match(saMig, sbMig);
  await selectBoth(saMig, sbMig);

  // A 再登录并新开连接，应接续战斗而不是判负
  const loginAMig2 = await post('/api/auth/login', { account: accA, password: 'Aa123456!' });
  const saMig2 = io(URL, { transports: ['websocket'], forceNew: true, reconnection: false });
  await new Promise((resolve, reject) => {
    saMig2.on('connect', resolve);
    saMig2.on('connect_error', reject);
  });

  const kickedAMig = once(saMig, 'session:kicked');
  const stateAMig2 = once(saMig2, 'battle:state');
  let bGotGameOver = false;
  sbMig.on('battle:gameOver', () => {
    bGotGameOver = true;
  });

  saMig2.emit('session:hello', {
    playerId: `auth-A2-${Math.random().toString(16).slice(2, 8)}`,
    token: loginAMig2.body.token,
  });

  await kickedAMig;
  const stMig = await stateAMig2;
  check(
    '迁移后新连接接续战斗',
    stMig.phase === 'BATTLE' || stMig.phase === 'FORCED_SWITCH',
    `phase=${stMig.phase}`,
  );
  await new Promise((r) => setTimeout(r, 1200));
  check('战斗未被判负（对方未收到 gameOver）', bGotGameOver === false);

  saMig2.disconnect();
  sbMig.disconnect();

  console.log(`\n== 结果：通过 ${passed}，失败 ${failed} ==\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('冒烟测试异常：', e);
  process.exit(2);
});
