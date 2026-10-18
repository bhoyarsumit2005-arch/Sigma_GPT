import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState, useEffect, useRef } from "react";
import { API_BASE } from "./api.js";
import { getInitials } from "./theme.js";

function ChatWindow() {
  const {
    prompt, setPrompt, setReply, error, setError,
    currThreadId, prevChats, setPrevChats, setNewChat,
    logout, sessionExpired, openSettings, user,
  } = useContext(MyContext);

  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  //the request that last failed, so the error banner can offer a real Retry
  const [failedRequest, setFailedRequest] = useState(null);

  //ref guard: state updates are async, so a double click / double Enter in
  //the same tick would slip past the `loading` check
  const busyRef = useRef(false);
  const textareaRef = useRef(null);

  //the account menu lives in two pieces: the icon sits in the navbar while the
  //dropdown renders as a sibling, so both need their own ref
  const iconWrapRef = useRef(null);
  const dropDownRef = useRef(null);
  const iconBtnRef = useRef(null);

  //auto-grow the composer: grow with the text, cap at a comfortable height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [prompt]);

  //close the account menu when a click lands outside it. pointerdown runs
  //before the click, so the menu is already gone when the new target reacts —
  //which is exactly why the check must accept both halves of the menu: if a
  //dropdown item counted as "outside", the menu would unmount on pointerdown
  //and the item's click would never fire.
  //focusout covers Tab: leaving the menu closes it instead of leaving a
  //stray dropdown over the page.
  useEffect(() => {
    if (!isOpen) return;

    const close = () => setIsOpen(false);

    //a node counts as inside when it is under the icon or under the dropdown
    const isInsideMenu = (node) =>
      node instanceof Node &&
      (iconWrapRef.current?.contains(node) || dropDownRef.current?.contains(node));

    const onPointerDown = (e) => {
      if (!isInsideMenu(e.target)) close();
    };

    const onFocusOut = (e) => {
      if (!isInsideMenu(e.relatedTarget)) close();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [isOpen]);

  //Escape closes the menu and hands focus back to the icon
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      setIsOpen(false);
      iconBtnRef.current?.focus();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

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
    setIsOpen((open) => !open);
  };

  const handleSettingsClick = () => {
    setIsOpen(false);
    openSettings();
  };

  const handleLogoutClick = () => {
    setIsOpen(false);
    logout();
  };

  //every focusable menu item, in visual order — they live in the dropdown
  const getMenuItems = () =>
    Array.from(dropDownRef.current?.querySelectorAll('[role="menuitem"]') || []);

  //ArrowDown / ArrowUp cycle through the open menu (standard menu pattern)
  const handleMenuKeyDown = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

    const items = getMenuItems();
    if (!items.length) return;
    e.preventDefault();

    const index = items.indexOf(document.activeElement);
    const next =
      e.key === "ArrowDown"
        ? (index + 1) % items.length //no focus yet → index -1 → 0
        : index <= 0
          ? items.length - 1
          : index - 1;
    items[next].focus();
  };

  //Arrow keys on the icon open the menu (and land on the first item) or,
  //when it is already open, keep the arrow cycling going.
  const handleIconKeyDown = (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

    if (isOpen) {
      handleMenuKeyDown(e);
      return;
    }

    e.preventDefault();
    setIsOpen(true);
    //the menu renders on this state change; focus it on the next frame
    requestAnimationFrame(() => getMenuItems()[0]?.focus());
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
        <div className="userIconDiv" ref={iconWrapRef}>
          <button
            type="button"
            ref={iconBtnRef}
            className="userIcon"
            onClick={handleProfileClick}
            onKeyDown={handleIconKeyDown}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-controls="profile-menu"
            aria-label="Account menu"
            title="Account menu"
          >
            {user?.avatar ? (
              <img className="userIconImg" src={user.avatar} alt="" aria-hidden="true" />
            ) : (
              getInitials(user?.name)
            )}
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          className="dropDown"
          id="profile-menu"
          ref={dropDownRef}
          role="menu"
          aria-label="Account menu"
          onKeyDown={handleMenuKeyDown}
        >
          <div className="dropDownHead" role="none">
            <span className="dropDownAvatar" aria-hidden="true">
              {user?.avatar
                ? <img className="dropDownAvatarImg" src={user.avatar} alt="" />
                : getInitials(user?.name)}
            </span>
            <span className="dropDownUser">
              <span className="dropDownName">{user?.name || "Sigma User"}</span>
              <span className="dropDownEmail">{user?.email || "AI Workspace"}</span>
            </span>
          </div>

          <button type="button" className="dropDownItem" role="menuitem" onClick={handleSettingsClick}>
            <i className="fa-solid fa-gear" aria-hidden="true"></i> Settings
          </button>
          <button type="button" className="dropDownItem danger" role="menuitem" onClick={handleLogoutClick}>
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i> Log out
          </button>
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
