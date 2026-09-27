import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { GameController } from '../hooks/useGame';
import type { CurrentUser } from '../auth/user';
import { DEFAULT_AVATAR } from '../auth/user';
import { isSixDigitAccount, validateNickname, validatePassword } from '../auth/validation';
import { register } from '../api/auth';
import ParticleBackground from '../components/ParticleBackground';
import FireEnergy from '../components/FireEnergy';
import { playBGM, playSFX } from '../audio';

interface Props {
  game: GameController;
  setUser: (u: CurrentUser) => void;
}

const ACCEPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export default function RegisterPage({ game, setUser }: Props) {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string>(DEFAULT_AVATAR);
  const [avatarData, setAvatarData] = useState<string>(DEFAULT_AVATAR);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    playBGM('auth');
  }, []);

  const accountOk = isSixDigitAccount(account);
  const passwordResult = validatePassword(password);
  const nicknameResult = validateNickname(nickname);
  const confirmMismatch = confirm !== '' && confirm !== password;

  const canRegister =
    accountOk &&
    passwordResult.ok &&
    confirm !== '' &&
    !confirmMismatch &&
    nicknameResult.ok &&
    !submitting;

  const onAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPT_TYPES.includes(file.type)) {
      setError('仅支持 JPG / PNG / WEBP / GIF 图片');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('头像大小不能超过 2MB');
      return;
    }
    setError('');
    setAvatarPreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = () =>
      setAvatarData(typeof reader.result === 'string' ? reader.result : DEFAULT_AVATAR);
    reader.readAsDataURL(file);
  };

  const onResetAvatar = () => {
    setAvatarPreview(DEFAULT_AVATAR);
    setAvatarData(DEFAULT_AVATAR);
  };

  const onRegister = async () => {
    if (!canRegister) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await register({
        account,
        password,
        nickname: nickname.trim(),
        avatar: avatarData,
      });
      if (res.success && res.token && res.user) {
        playSFX('match');
        setSuccess(true);
        setUser({
          id: res.user.id,
          account: res.user.account,
          nickname: res.user.nickname,
          avatar: res.user.avatar,
          isGuest: false,
          token: res.token,
        });
        game.refreshAuth();
        window.setTimeout(() => game.guestLogin(), 1200);
      } else {
        setError(res.message ?? '注册失败，请重试');
      }
    } catch {
      setError('注册失败，请检查网络');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page page--auth">
      <ParticleBackground />
      <FireEnergy />
      <div className="auth-card auth-card--register">
        <h2 className="auth-title">注册</h2>

        <div className="avatar-picker">
          <img className="avatar-picker__preview" src={avatarPreview} alt="头像" />
          <div className="avatar-picker__actions">
            <button className="btn btn--ghost btn--small" onClick={onResetAvatar}>
              使用默认头像
            </button>
            <button className="btn btn--ghost btn--small" onClick={() => fileRef.current?.click()}>
              上传头像
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={onAvatarChange}
            />
          </div>
        </div>

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
          {account !== '' && !accountOk && (
            <span className="field__error">账号必须为6位数字</span>
          )}
        </label>

        <label className="field">
          <span className="field__label">密码</span>
          <input
            className="field__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="需包含大小写字母、数字、特殊字符"
          />
          {password !== '' && !passwordResult.ok && (
            <span className="field__error">{passwordResult.message}</span>
          )}
        </label>

        <label className="field">
          <span className="field__label">再次输入密码</span>
          <input
            className="field__input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="请再次输入密码"
          />
          {confirmMismatch && <span className="field__error">两次输入的密码不同</span>}
        </label>

        <label className="field">
          <span className="field__label">昵称</span>
          <input
            className="field__input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="2~12个字符"
            maxLength={12}
          />
          {nickname !== '' && !nicknameResult.ok && (
            <span className="field__error">{nicknameResult.message}</span>
          )}
        </label>

        {error && <p className="field__error">{error}</p>}
        {success && <p className="auth-success">✅ 注册成功，正在进入游戏……</p>}

        <button
          className="btn btn--primary btn--glow btn--block"
          disabled={!canRegister}
          onClick={onRegister}
        >
          {submitting ? '注册中…' : '注册'}
        </button>

        <button className="btn btn--ghost btn--small" onClick={game.goToWelcome}>
          返回
        </button>
      </div>
    </div>
  );
}
