import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState, useEffect, useRef } from "react";
import { API_BASE } from "./api.js";

function ChatWindow() {
  const {
    prompt, setPrompt, setReply, error, setError,
    currThreadId, prevChats, setPrevChats, setNewChat,
    logout, sessionExpired, openSettings,
  } = useContext(MyContext);

  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  //the request that last failed, so the error banner can offer a real Retry
  const [failedRequest, setFailedRequest] = useState(null);

  //ref guard: state updates are async, so a double click / double Enter in
  //the same tick would slip past the `loading` check
  const busyRef = useRef(false);
  const textareaRef = useRef(null);

  //auto-grow the composer: grow with the text, cap at a comfortable height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [prompt]);

  //single request path for new messages, retries and regeneration
  const sendRequest = async (message, { regenerate = false, keepUserMessage = false } = {}) => {
    const msg = (message || "").trim();
    if ((!msg && !regenerate) || busyRef.current) return;

    busyRef.current = true;
    setLoading(true);
    setNewChat(false);
    setError(null);
    setFailedRequest(null);

    //a retry replays a message that is already in the list — never add it twice
    if (!regenerate && !keepUserMessage) {
      setPrompt("");
      setReply(null);
      //the user's message appears right away instead of waiting for the reply
      setPrevChats((prev) => [...prev, { role: "user", content: msg }]);
    }

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: regenerate
            ? //regenerate re-answers the last user message from the server
            [...prevChats].reverse().find((c) => c.role === "user")?.content || msg
            : msg,
          threadId: currThreadId,
          ...(regenerate ? { regenerate: true } : {}),
        }),
      });
      const res = await response.json();

      if (response.status === 401) {
        sessionExpired();
        return;
      }

      if (!response.ok || !res.reply) {
        const text = res.error || "Something went wrong. Please try again.";
        setError(text);
        //remember what failed so Retry can replay it exactly once
        setFailedRequest({ message: msg, regenerate });
        return;
      }

      setReply(res.reply);
      setPrevChats((prev) => {
        //regeneration replaces the trailing assistant answer
        const base =
          regenerate && prev[prev.length - 1]?.role === "assistant"
            ? prev.slice(0, -1)
            : prev;
        return [...base, { role: "assistant", content: res.reply }];
      });
    } catch (err) {
      console.log(err);
      setError("Network error. Make sure the backend server is running.");
      setFailedRequest({ message: msg, regenerate });
    } finally {
      setLoading(false);
      busyRef.current = false;
    }
  };

  const getReply = () => sendRequest(prompt);

  const retryRequest = () => {
    if (!failedRequest || loading) return;
    //the failed user message is already in the list — replay it without
    //appending it a second time
    sendRequest(failedRequest.message, {
      regenerate: failedRequest.regenerate,
      keepUserMessage: true,
    });
  };

  const regenerateReply = () => {
    if (loading || !prevChats?.length) return;
    const lastUser = [...prevChats].reverse().find((c) => c.role === "user");
    if (!lastUser) return;
    sendRequest(lastUser.content, { regenerate: true });
  };

  const handleProfileClick = () => {
    setIsOpen(!isOpen);
  };

  const handleSettingsClick = () => {
    setIsOpen(false);
    openSettings();
  };

  //Enter sends, Shift+Enter inserts a newline. IME composition (e.g. typing
  //Japanese/Chinese) must not send mid-composition.
  const handleKeyDown = (e) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    getReply();
  };

  return (
    <div className="chatWindow">
      <div className="navbar">
        <span className="nav-brand">
          <span className="status-dot"></span>
          Sigma AI
          <small className="nav-tag">AI Workspace</small>
        </span>
        <div className="userIconDiv" onClick={handleProfileClick}>
          <span className="userIcon"><i className="fa-solid fa-user"></i></span>
        </div>
      </div>

      {isOpen && (
        <div className="dropDown">
          <div className="dropDownItem"> <i className="fa-solid fa-cloud-arrow-up"></i> Upgrade plan</div>
          <div className="dropDownItem" onClick={handleSettingsClick}> <i className="fa-solid fa-gear"></i> Settings</div>
          <div className="dropDownItem" onClick={logout}> <i className="fa-solid fa-right-from-bracket"></i> Log out</div>
        </div>
      )}

      <Chat loading={loading} onRegenerate={regenerateReply}></Chat>

      {error && (
        <div className="errorBanner" role="alert">
          <span>{error}</span>
          {failedRequest && (
            <button type="button" className="retryBtn" onClick={retryRequest} disabled={loading}>
              <i className="fa-solid fa-rotate-right"></i>
              Retry
            </button>
          )}
        </div>
      )}

      <div className="chatInput">
        <div className="inputBox">
          <textarea
            ref={textareaRef}
            placeholder="Ask Sigma anything...."
            value={prompt}
            rows={1}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            id="submit"
            onClick={getReply}
            disabled={!prompt.trim() || loading}
            aria-label="Send"
          >
            {loading
              ? <i className="fa-solid fa-circle-notch fa-spin"></i>
              : <i className="fa-solid fa-paper-plane"></i>}
          </button>
        </div>
        <p className="info">
          Sigma AI can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}

export default ChatWindow;
