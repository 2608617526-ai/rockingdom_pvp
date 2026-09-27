import type { CurrentUser } from '../auth/user';
import { playSFX } from '../audio';

interface Props {
  user: CurrentUser;
  onClose: () => void;
  onLogout: () => void;
}

/** 账号信息弹窗：展示头像/昵称/账号，正式账号提供「退出登录」 */
export default function AccountModal({ user, onClose, onLogout }: Props) {
  return (
    <div className="modal account-modal">
      <div className="modal__box account-modal__box">
        <h3 className="modal__title">账号信息</h3>
        <img className="account-modal__avatar" src={user.avatar} alt="头像" />
        <div className="account-modal__name">{user.nickname}</div>
        {user.isGuest ? (
          <p className="account-modal__hint">当前为游客，登录后可保存历史战绩</p>
        ) : (
          <p className="account-modal__account">账号：{user.account}</p>
        )}
        <div className="account-modal__actions">
          {!user.isGuest && (
            <button className="btn btn--danger btn--small" onClick={onLogout}>
              退出登录
            </button>
          )}
          <button
            className="btn btn--ghost btn--small"
            onClick={() => {
              playSFX('back');
              onClose();
            }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
