import { useEffect, useState } from 'react';

interface ToastItem {
  id: number;
  message: string;
}

let nextId = 1;
let pushToast: ((message: string) => void) | null = null;

/** 全局展示一条游戏风格提示（替代浏览器 alert） */
export function showToast(message: string): void {
  pushToast?.(message);
}

/** 提示条容器：渲染在 App 顶层，自动堆叠并淡出 */
export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    pushToast = (message) => {
      const id = nextId++;
      setToasts((list) => [...list, { id, message }]);
      window.setTimeout(() => {
        setToasts((list) => list.filter((t) => t.id !== id));
      }, 2800);
    };
    return () => {
      pushToast = null;
    };
  }, []);

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.message}
        </div>
      ))}
    </div>
  );
}
