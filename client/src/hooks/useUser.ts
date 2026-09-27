import { useCallback, useState } from 'react';
import type { CurrentUser } from '../auth/user';
import { GUEST_USER, loadStoredUser, saveSession } from '../auth/user';

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
  return { user, setUser: updateUser };
}
