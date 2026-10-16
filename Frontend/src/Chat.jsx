import "./Chat.css";
import { useContext, useState, useEffect, useRef } from "react";
import { MyContext } from "./MyContext.jsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

//clickable example prompts for the empty-conversation welcome screen.
//Clicking one only fills the composer — the user still decides when to send.
const EXAMPLE_PROMPTS = [
  {
    icon: "🧠",
    title: "Explain a concept",
    text: "Explain how the JavaScript event loop works, in simple terms.",
  },
  {
    icon: "💻",
    title: "Write code",
    text: "Write a debounce function in JavaScript and explain how it works.",
  },
  {
    icon: "📚",
    title: "Study notes",
    text: "Summarize the key differences between SQL and NoSQL databases.",
  },
  {
    icon: "⚡",
    title: "Build a project",
    text: "Give me a step-by-step plan to build a to-do list app with React.",
  },
];

//language → file extension, used for the Download Code button
const CODE_EXTENSIONS = {
  javascript: "js", js: "js", jsx: "jsx",
  typescript: "ts", ts: "ts", tsx: "tsx",
  python: "py", py: "py",
  html: "html", css: "css", scss: "scss", json: "json",
  bash: "sh", sh: "sh", shell: "sh", zsh: "sh",
  sql: "sql", java: "java", go: "go", rust: "rs",
  c: "c", cpp: "cpp", "c++": "cpp", csharp: "cs", "c#": "cs",
  php: "php", ruby: "rb", rb: "rb", swift: "swift", kotlin: "kt",
  markdown: "md", md: "md", xml: "xml", yaml: "yml", yml: "yml",
};

//recursively pulls the plain text out of rendered react-markdown children
//(highlighted code is a tree of <span> elements, so join all string leaves)
function getRawText(node) {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getRawText).join("");
  if (node?.props?.children) return getRawText(node.props.children);
  return "";
}

//copy helper with a graceful fallback for browsers/contexts
//where the clipboard API is unavailable
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

//fenced code block: language label + Copy / Download, highlighted content
function CodeBlock({ language, code, children }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyText(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleDownload = () => {
    const ext = CODE_EXTENSIONS[(language || "").toLowerCase()] || "txt";
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sigma-code.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-lang">{language || "code"}</span>
        <div className="code-actions">
          <button type="button" className="code-btn" onClick={handleCopy}>
            <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"}`}></i>
            {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" className="code-btn" onClick={handleDownload}>
            <i className="fa-solid fa-download"></i>
            Download
          </button>
        </div>
      </div>
      <pre className="code-pre">{children}</pre>
    </div>
  );
}

//one AI message: avatar, name, markdown body, action row
function AssistantCard({ content, showRegenerate, onRegenerate, feedback, onFeedback }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyText(content);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="message-row assistant">
      <div className="assistant-avatar">&#931;</div>
      <div className="message-content">
        <div className="assistant-info">
          <span className="assistant-name">Sigma AI</span>
          <span className="assistant-badge">AI</span>
        </div>

        <div className="markdown">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              //react-markdown wraps fenced code in <pre>; use that hook to
              //add the toolbar while keeping the highlighted children as-is
              pre: ({ children }) => {
                const codeElement = Array.isArray(children) ? children[0] : children;
                const className = codeElement?.props?.className || "";
                const language = className.replace("language-", "") || "";
                const code = getRawText(codeElement?.props?.children);
                return (
                  <CodeBlock language={language} code={code}>
                    {children}
                  </CodeBlock>
                );
              },
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {String(content ?? "")}
          </ReactMarkdown>
        </div>

        <div className="msg-actions">
          <button type="button" className="msg-action" onClick={handleCopy}>
            <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"}`}></i>
            {copied ? "Copied" : "Copy"}
          </button>

          {showRegenerate && (
            <button type="button" className="msg-action" onClick={onRegenerate}>
              <i className="fa-solid fa-rotate-right"></i>
              Regenerate
            </button>
          )}

          <button
            type="button"
            className={`msg-action icon-only ${feedback === "up" ? "active up" : ""}`}
            onClick={() => onFeedback(feedback === "up" ? null : "up")}
            title="Helpful"
            aria-label="Helpful"
          >
            <i className="fa-solid fa-thumbs-up"></i>
          </button>

          <button
            type="button"
            className={`msg-action icon-only ${feedback === "down" ? "active down" : ""}`}
            onClick={() => onFeedback(feedback === "down" ? null : "down")}
            title="Not helpful"
            aria-label="Not helpful"
          >
            <i className="fa-solid fa-thumbs-down"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

function Chat({ loading, onRegenerate }) {
  const { newChat, prevChats, currThreadId, setPrompt } = useContext(MyContext);
  //helpful/not-helpful choice per message, keyed by thread + position so
  //switching conversations never shows another thread's feedback
  const [feedbackMap, setFeedbackMap] = useState({});
  const chatsRef = useRef(null);

  //auto scroll to the latest message, but only when the user is already
  //near the bottom — never yank them away from older messages
  useEffect(() => {
    const el = chatsRef.current;
    if (!el) return;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (nearBottom || loading) {
      el.scrollTop = el.scrollHeight;
    }
  }, [prevChats, loading]);

  const setFeedback = (key, value) => {
    setFeedbackMap((prev) => ({ ...prev, [key]: value }));
  };

  const showWelcome = newChat && prevChats?.length === 0;

  if (showWelcome) {
    return (
      <div className="chat-main">
        <div className="welcome-screen">
          <div className="welcome-icon">&#931;</div>
          <h1>Think. Create. Build.</h1>
          <p>Your intelligent workspace for ideas, code and learning.</p>

          <div className="suggestions">
            {EXAMPLE_PROMPTS.map((s, idx) => (
              <button
                type="button"
                className="suggestion-card"
                key={idx}
                onClick={() => setPrompt(s.text)}
              >
                <span className="s-emoji">{s.icon}</span>
                <strong>{s.title}</strong>
                <small>{s.text}</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const lastIndex = (prevChats?.length || 0) - 1;

  return (
    <div className="chat-main">
      <div className="chats" ref={chatsRef}>
        {prevChats?.map((chat, idx) =>
          chat.role === "user" ? (
            <div className="message-row user" key={`${currThreadId}-${idx}`}>
              <div className="message-content">{chat.content}</div>
            </div>
          ) : (
            <AssistantCard
              key={`${currThreadId}-${idx}`}
              content={chat.content}
              showRegenerate={idx === lastIndex && !loading}
              onRegenerate={onRegenerate}
              feedback={feedbackMap[`${currThreadId}:${idx}`] || null}
              onFeedback={(value) => setFeedback(`${currThreadId}:${idx}`, value)}
            />
          )
        )}

        {loading && (
          <div className="message-row assistant" key="loader">
            <div className="assistant-avatar">&#931;</div>
            <div className="message-content loading-card">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="loading-label">Thinking…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
