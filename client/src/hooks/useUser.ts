import { useCallback, useEffect, useState } from 'react';
import type { CurrentUser } from '../auth/user';
import { GUEST_USER, getToken, loadStoredUser, saveSession } from '../auth/user';
import { fetchMe } from '../api/auth';

export interface UserController {
  user: CurrentUser;
  setUser: (user: CurrentUser) => void;
}

/** 当前登录用户：正式账号持久化到 localStorage，刷新后恢复；游客默认。 */
export function useUser(): UserController {
  const [user, setUser] = useState<CurrentUser>(() => loadStoredUser());
  const updateUser = useCallback((next: CurrentUser) => {
    saveSession(next);
    setUser(next);
  }, []);

  // 启动时校验 token：若已在别处失效（被挤下线 / 删除），清掉本地登录态
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    let cancelled = false;
    fetchMe(token)
      .then((res) => {
        if (!cancelled && !res.success) updateUser(GUEST_USER);
      })
      .catch(() => {
        // 网络异常时保留现状，不做处理
      });
    return () => {
      cancelled = true;
    };
  }, [updateUser]);

  return { user, setUser: updateUser };
}
