import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, RotateCcw, Bot, ArrowRight } from 'lucide-react';
import { DESTINATIONS } from './destinations';
import { offlineReply, destinationCatalog, WELCOME_SUGGESTIONS } from './chatAssistant';
import { chatWithAI, hasAIKey } from './geminiService';

const STORAGE_KEY = 'wanderai_chat';
const MAX_STORED = 40;

function loadMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveMessages(messages) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
  } catch {
    // Storage unavailable; the chat just won't persist
  }
}

// Renders **bold** inside a line of text
function Inline({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
  );
}

// Minimal Markdown: paragraphs, "- " bullets and "1. " numbered lists
function RichText({ text }) {
  const blocks = [];
  for (const line of text.split('\n')) {
    const bullet = line.match(/^\s*[-•*]\s+(.*)/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)/);
    const type = bullet ? 'ul' : numbered ? 'ol' : 'p';
    const content = bullet?.[1] ?? numbered?.[1] ?? line;
    if (!content.trim()) continue;
    const last = blocks[blocks.length - 1];
    if (type !== 'p' && last?.type === type) last.items.push(content);
    else blocks.push({ type, items: [content] });
  }
  return blocks.map((block, i) => {
    if (block.type === 'p') return <p key={i}><Inline text={block.items[0]} /></p>;
    const List = block.type;
    return <List key={i}>{block.items.map((item, j) => <li key={j}><Inline text={item} /></li>)}</List>;
  });
}

export default function ChatBot({ originCity, onOriginChange, currentDest, currentTripTitle, onPlanTrip }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadMessages);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [lastDestId, setLastDestId] = useState(null);
  const [seen, setSeen] = useState(() => loadMessages().length > 0);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => saveMessages(messages), [messages]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const openChat = () => {
    setOpen(true);
    setSeen(true);
  };

  const planTrip = (destId, days) => {
    const dest = DESTINATIONS.find((d) => d.id === destId);
    if (!dest) return;
    onPlanTrip(dest, days || dest.days.length);
    // On phones the panel covers the page, so get out of the way
    if (window.innerWidth < 640) setOpen(false);
  };

  const send = async (raw) => {
    const text = raw.trim();
    if (!text || typing) return;
    setInput('');

    const userMsg = { id: Date.now(), role: 'user', text };
    const history = messages;
    setMessages((prev) => [...prev, userMsg]);
    setTyping(true);

    let reply = null;
    if (hasAIKey) {
      const ai = await chatWithAI(history, text, {
        origin: originCity,
        currentTrip: currentTripTitle,
        catalog: destinationCatalog(),
      });
      if (ai) {
        reply = {
          text: ai.text,
          actions: ai.planIds.map((destId) => ({ type: 'plan', destId })),
          source: 'gemini',
        };
      }
    }

    if (!reply) {
      const [offline] = await Promise.all([
        offlineReply(text, { origin: originCity, lastDestId, currentDestId: currentDest?.id }),
        new Promise((resolve) => setTimeout(resolve, 500)), // brief pause so the typing indicator reads naturally
      ]);
      reply = { ...offline, source: 'assistant' };
      if (offline.origin && offline.origin !== originCity) onOriginChange(offline.origin);
      if (offline.lastDestId) setLastDestId(offline.lastDestId);
      if (offline.autoPlan) planTrip(offline.autoPlan.destId, offline.autoPlan.days);
    }

    setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'bot', ...reply }]);
    setTyping(false);
  };

  const clearChat = () => {
    setMessages([]);
    setLastDestId(null);
  };

  // Welcome suggestions adapt to the trip that's open
  const welcomeSuggestions = currentDest
    ? [`How to reach ${currentDest.name}?`, `What to pack for ${currentDest.name}?`, `Weather in ${currentDest.name} now?`, 'Where should I go next month?']
    : WELCOME_SUGGESTIONS;
  const lastBot = [...messages].reverse().find((m) => m.role === 'bot');
  const suggestions = messages.length === 0 ? welcomeSuggestions : (!typing && lastBot === messages[messages.length - 1] && lastBot?.suggestions) || [];

  return (
    <>
      {!open && (
        <button type="button" className="chat-fab" onClick={openChat} aria-label="Open WanderAI chat assistant">
          <MessageCircle size={22} />
          <span className="chat-fab-label">Ask AI</span>
          {!seen && <span className="chat-fab-dot" />}
        </button>
      )}

      {open && (
        <section className="chat-panel" role="dialog" aria-label="WanderAI chat assistant">
          <header className="chat-header">
            <div className="chat-avatar"><Bot size={20} /></div>
            <div className="chat-title">
              <strong>WanderAI Assistant</strong>
              <span><span className="chat-status-dot" /> {hasAIKey ? 'Powered by Gemini AI' : 'Smart travel assistant'}</span>
            </div>
            <button type="button" className="chat-icon-btn" onClick={clearChat} title="New chat" aria-label="Start a new chat">
              <RotateCcw size={16} />
            </button>
            <button type="button" className="chat-icon-btn" onClick={() => setOpen(false)} title="Close" aria-label="Close chat">
              <X size={18} />
            </button>
          </header>

          <div className="chat-messages" ref={listRef} aria-live="polite">
            <div className="chat-msg bot">
              <div className="chat-bubble">
                <p>Namaste! 🙏 I’m your travel assistant. Ask me where to go, which place is better, how to get there by flight, train or road, the best time to visit, or what to pack.</p>
                {currentDest && <p>I see you’re looking at <strong>{currentTripTitle}</strong>. Ask me anything about it!</p>}
              </div>
            </div>

            {messages.map((m) => (
              <div key={m.id} className={`chat-msg ${m.role}`}>
                <div className="chat-bubble">
                  <RichText text={m.text} />
                  {m.actions?.length > 0 && (
                    <div className="chat-actions">
                      {[...new Map(m.actions.map((a) => [a.destId, a])).values()].slice(0, 3).map((a) => {
                        const dest = DESTINATIONS.find((d) => d.id === a.destId);
                        return dest ? (
                          <button key={a.destId} type="button" className="chat-action" onClick={() => planTrip(a.destId, a.days)}>
                            {dest.emoji} Plan {dest.name} <ArrowRight size={13} />
                          </button>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                {m.role === 'bot' && m.source === 'gemini' && <span className="chat-source">✨ Gemini</span>}
              </div>
            ))}

            {typing && (
              <div className="chat-msg bot">
                <div className="chat-bubble chat-typing" aria-label="Assistant is typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="chat-suggestions">
              {suggestions.map((s) => (
                <button key={s} type="button" className="chat-suggestion" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          )}

          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about any trip…"
              aria-label="Message"
              maxLength={500}
            />
            <button type="submit" disabled={!input.trim() || typing} aria-label="Send message">
              <Send size={17} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
