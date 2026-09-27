import type { CurrentUser } from '../auth/user';

interface Props {
  user: CurrentUser;
  className?: string;
  onClick?: () => void;
}

/** 左上角用户信息（头像 + 昵称）。默认绝对定位到页面左上角，传入 className 可改为静态流式布局；传入 onClick 变为可点击。 */
export default function UserBadge({ user, className, onClick }: Props) {
  return (
    <div
      className={`user-badge ${className ?? ''} ${onClick ? 'user-badge--clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <img className="user-badge__avatar" src={user.avatar} alt="头像" />
      <span className="user-badge__name">{user.nickname}</span>
    </div>
  );
}
