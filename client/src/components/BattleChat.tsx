import { useEffect, useRef, useState } from 'react';
import { socket } from '../socket';

interface ChatMessage {
  id: number;
  name: string;
  text: string;
  self: boolean;
}

interface Props {
  selfId: string;
}

/** 战斗内实时聊天：按钮展开/收起，消息仅存于对局内存，离开战斗页即销毁（不落库） */
export default function BattleChat({ selfId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const idRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onChat = (msg: { playerId: string; name: string; text: string }) => {
      idRef.current += 1;
      setMessages((list) => [
        ...list,
        { id: idRef.current, name: msg.name, text: msg.text, self: msg.playerId === selfId },
      ]);
      // 收到新消息时自动展开，避免漏看
      setOpen(true);
    };
    socket.on('chat:message', onChat);
    return () => {
      socket.off('chat:message', onChat);
    };
  }, [selfId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    socket.emit('chat:message', { text });
    setInput('');
  };

  return (
    <div className="battle-chat">
      <button className="battle-chat__toggle" onClick={() => setOpen((o) => !o)}>
        💬 聊天
      </button>
      {open && (
        <div className="battle-chat__panel">
          <div className="battle-chat__list" ref={listRef}>
            {messages.length === 0 && (
              <div className="battle-chat__empty">对局内聊天</div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`battle-chat__msg ${m.self ? 'battle-chat__msg--self' : ''}`}
              >
                <span className="battle-chat__name">{m.name}</span>
                <span className="battle-chat__text">{m.text}</span>
              </div>
            ))}
          </div>
          <div className="battle-chat__input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) send();
              }}
              placeholder="说点什么……"
              maxLength={120}
            />
            <button className="btn btn--primary btn--small" onClick={send}>
              发送
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
