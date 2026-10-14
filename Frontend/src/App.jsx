import { useState } from 'react';
import './App.css'
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import Settings from "./Settings.jsx";
import { MyContext } from './MyContext.jsx';
import { v1 as uuidv1 } from "uuid";
import { useEffect } from "react";
import Auth from "./Auth"
import { API_BASE } from "./api.js";
import { applyTheme, getStoredTheme } from "./theme.js";


function App() {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState(null);
  const [currThreadId, setCurrThreadId] = useState(uuidv1());
  const [prevChats, setPrevChats] = useState([]); //stores all chat of curr threads
  const [newChat, setNewChat] = useState(true);
  const [allThreads, setAllThreads] = useState([]);
  const [error, setError] = useState(null);

  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  //wipes every cached piece of chat state, so nothing from the previous
  //account can show up after logout or after another user logs in
  function clearChatState() {
    setPrompt("");
    setReply(null);
    setCurrThreadId(uuidv1());
    setPrevChats([]);
    setNewChat(true);
    setAllThreads([]);
    setError(null);
  }

  //ends the session locally: closes settings, drops private state, logs out
  function endSession() {
    setSettingsOpen(false);
    clearChatState();
    setUser(null);
  }

  //applies a theme and updates the signed-in account in context. Used by the
  //Settings appearance panel and after a profile save.
  function updateUser(nextUser) {
    setUser((prev) => ({ ...(prev || {}), ...nextUser }));

    if (nextUser?.theme) {
      applyTheme(nextUser.theme);
    }
  }


  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch(
          `${API_BASE}/api/auth/me`,
          { credentials: "include" }
        );

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          //the account preference wins over the locally cached one
          applyTheme(data.user?.theme || getStoredTheme());
        } else {
          setUser(null);
          applyTheme(getStoredTheme());
        }
      } catch {
        setUser(null);
        applyTheme(getStoredTheme());
      } finally {
        setCheckingAuth(false);
      }
    }

    checkSession();
  }, []);

  //when "system" is chosen, follow OS theme changes live
  useEffect(() => {
    const preference = user?.theme || getStoredTheme();
    if (preference !== "system") return;

    let media;
    try {
      media = window.matchMedia("(prefers-color-scheme: light)");
    } catch {
      return;
    }

    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);

    return () => media.removeEventListener("change", onChange);
  }, [user?.theme]);

  async function logout() {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      endSession();
    }
  }

  //revokes every session server-side, then clears local state
  async function logoutAll() {
    try {
      await fetch(`${API_BASE}/api/auth/logout-all`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      endSession();
    }
  }

  //called by any API that answers 401: the cookie is gone or invalid,
  //drop to the login screen without keeping any private data around
  function sessionExpired() {
    endSession();
  }

  function handleAuthenticated(nextUser) {
    clearChatState();
    setUser(nextUser);
    applyTheme(nextUser?.theme || getStoredTheme());
  }

  const providerValues = {
    prompt, setPrompt,
    reply, setReply,
    currThreadId, setCurrThreadId,
    newChat, setNewChat,
    prevChats, setPrevChats,
    allThreads, setAllThreads,
    error, setError,
    user,
    updateUser,
    logout,
    logoutAll,
    sessionExpired,
    settingsOpen,
    setSettingsOpen,
    openSettings: () => setSettingsOpen(true),
    closeSettings: () => setSettingsOpen(false),
    handleAccountDeleted: endSession
  };

  if (checkingAuth) {
    return <div className="auth-loading">Loading Sigma AI...</div>;
  }

  if (!user) {
    return <Auth onAuthenticated={handleAuthenticated} />;
  }
  return (
    <div className='app'>
      <MyContext.Provider value={providerValues}>
        <Sidebar></Sidebar>
        <ChatWindow></ChatWindow>
        {settingsOpen && <Settings />}
      </MyContext.Provider>
    </div>
  )
}

export default App;
