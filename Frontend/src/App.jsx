import { useState } from 'react';
import './App.css'
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import { MyContext } from './MyContext.jsx';
import { v1 as uuidv1 } from "uuid";
import { useEffect } from "react";
import Auth from "./Auth"


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


  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch(
          "http://localhost:8080/api/auth/me",
          { credentials: "include" }
        );

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkSession();
  }, []);

  async function logout() {
    try {
      await fetch("http://localhost:8080/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      clearChatState();
      setUser(null);
    }
  }

  //called by any API that answers 401: the cookie is gone or invalid,
  //drop to the login screen without keeping any private data around
  function sessionExpired() {
    clearChatState();
    setUser(null);
  }

  function handleAuthenticated(nextUser) {
    clearChatState();
    setUser(nextUser);
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
    logout,
    sessionExpired
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
      </MyContext.Provider>
    </div>
  )
}

export default App;
