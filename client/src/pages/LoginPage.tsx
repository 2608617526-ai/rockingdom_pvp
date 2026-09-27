import { useEffect, useState } from 'react';
import type { GameController } from '../hooks/useGame';
import type { CurrentUser } from '../auth/user';
import { isSixDigitAccount } from '../auth/validation';
import { login } from '../api/auth';
import ParticleBackground from '../components/ParticleBackground';
import FireEnergy from '../components/FireEnergy';
import { playBGM, playSFX } from '../audio';

interface Props {
  game: GameController;
  setUser: (u: CurrentUser) => void;
}

export default function LoginPage({ game, setUser }: Props) {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    playBGM('lobby');
  }, []);

  const onLogin = async () => {
    if (submitting) return;
    if (!isSixDigitAccount(account)) {
      setError('账号必须为6位数字');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await login(account, password);
      if (res.success && res.token && res.user) {
        playSFX('match');
        setUser({
          id: res.user.id,
          account: res.user.account,
          nickname: res.user.nickname,
          avatar: res.user.avatar,
          isGuest: false,
          token: res.token,
        });
        game.refreshAuth();
        game.guestLogin();
      } else {
        setError(res.message ?? '账号或密码错误');
      }
    } catch {
      setError('登录失败，请检查网络');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page page--auth">
      <ParticleBackground />
      <FireEnergy />
      <div className="auth-card">
        <h2 className="auth-title">登录</h2>

        <label className="field">
          <span className="field__label">账号</span>
          <input
            className="field__input"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="请输入6位数字"
            inputMode="numeric"
            maxLength={6}
          />
        </label>

        <label className="field">
          <span className="field__label">密码</span>
          <input
            className="field__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            onKeyDown={(e) => e.key === 'Enter' && onLogin()}
          />
        </label>

        {error && <p className="field__error">{error}</p>}

        <button
          className="btn btn--primary btn--glow btn--block"
          disabled={submitting || account === '' || password === ''}
          onClick={onLogin}
        >
          {submitting ? '登录中…' : '登录'}
        </button>

        <div className="auth-actions">
          <button className="btn btn--ghost btn--small" onClick={game.goToRegister}>
            注册
          </button>
          <button className="btn btn--ghost btn--small" onClick={game.guestLogin}>
            游客登录
          </button>
          <button className="btn btn--ghost btn--small" onClick={game.goToWelcome}>
            返回
          </button>
        </div>
      </div>
    </div>
  );
}
