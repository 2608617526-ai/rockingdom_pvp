import type { ReactNode } from 'react';

interface Props {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  placement?: 'top' | 'bottom';
}

/** 纯 CSS 悬浮提示 */
export default function Tooltip({
  content,
  children,
  className,
  placement = 'top',
}: Props) {
  return (
    <div className={`tooltip tooltip--${placement} ${className ?? ''}`}>
      {children}
      <div className="tooltip__popup">{content}</div>
    </div>
  );
}
