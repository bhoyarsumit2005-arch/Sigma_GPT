import "./Sidebar.css";
import { useContext, useEffect } from "react";
import { MyContext } from "./MyContext.jsx";
import { v1 as uuidv1 } from "uuid";
import { getInitials } from "./theme.js";

function Sidebar() {
  const { allThreads, setAllThreads, currThreadId, setNewChat, setPrompt, setReply, setCurrThreadId, setPrevChats, setError } = useContext(MyContext);
  const { user, logout, sessionExpired, openSettings } = useContext(MyContext);


  const getAllThreads = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/thread", { credentials: "include" });

      if (response.status === 401) {
        sessionExpired();
        return;
      }

      const res = await response.json();

      if (!response.ok || !Array.isArray(res)) {
        console.log(res?.error || "Failed to load conversations");
        return;
      }

      const filteredData = res.map(thread => ({ threadId: thread.threadId, title: thread.title }));
      //console.log(filteredData);
      setAllThreads(filteredData);
    } catch (err) {
      console.log(err);
    }

  };

  useEffect(() => {
    getAllThreads();
  }, [currThreadId, user?.id])

  const createNewChat = () => {
    setNewChat(true);
    setPrompt("");
    setReply(null);
    setError(null);
    setCurrThreadId(uuidv1());
    setPrevChats([]);
  }

  const changeThread = async (newThreadId) => {
    setError(null);

    try {
      const response = await fetch(`http://localhost:8080/api/thread/${newThreadId}`, { credentials: "include" });

      if (response.status === 401) {
        sessionExpired();
        return;
      }

      const res = await response.json();

      //404 means the thread does not exist or belongs to someone else
      if (!response.ok) {
        setError(res.error || "Could not open this conversation.");
        return;
      }

      //only switch once the backend confirmed ownership
      setCurrThreadId(newThreadId);
      setPrevChats(Array.isArray(res) ? res : []);
      setNewChat(false);
      setReply(null);
    } catch (err) {
      console.log(err);
    }
  }


  const deleteThread = async (threadId) => {
    try {
      const response = await fetch(`http://localhost:8080/api/thread/${threadId}`, { method: "DELETE", credentials: "include" });

      if (response.status === 401) {
        sessionExpired();
        return;
      }

      const res = await response.json();

      if (!response.ok) {
        setError(res.error || "Could not delete this conversation.");
        return;
      }

      //updates threads re-render
      setAllThreads(prev => prev.filter(thread => thread.threadId !== threadId));

      if (threadId === currThreadId) {
        createNewChat();
      }

    } catch (err) {
      console.log(err);
    }
  }


  return (
    <section className="sidebar">
      {/* branding */}
      <div className="sigma-logo">
        <div className="sigma-icon">&#931;</div>
        <div className="sigma-text">
          <h2>SIGMA AI</h2>
          <span>Intelligent Workspace</span>
        </div>
      </div>

      {/* new chat button*/}
      <button className="new-chat-btn" onClick={createNewChat}>
        <span className="plus">+</span>
        <div className="new-chat-label">
          <strong>New Conversation</strong>
          <small>Start fresh</small>
        </div>
      </button>

      {/* history */}
      <div className="history">
        <div className="recent-title">RECENT</div>
        <ul>
          {
            allThreads?.map((thread, idx) => (
              <li key={idx}
                onClick={() => changeThread(thread.threadId)}
                className={thread.threadId === currThreadId ? "highlighted" : ""}
              >
                <span className="thread-dot"></span>
                <span className="thread-title">{thread.title}</span>
                <i className="fa-solid fa-trash"
                  onClick={(e) => {
                    e.stopPropagation(); //stop event bubbling
                    deleteThread(thread.threadId);
                  }}
                ></i>
              </li>
            ))
          }
        </ul>

      </div>

      {/* profile */}
      <div className="profile-card">

        <div className="profile-avatar">
          {user?.avatar ? (
            <img src={user.avatar} alt="" aria-hidden="true" />
          ) : (
            getInitials(user?.name)
          )}
        </div>

        <div className="profile-info">
          <span className="profile-name">
            {user?.name || "Sigma User"}
          </span>

          <span className="profile-role">
            {user?.email || "AI Workspace"}
          </span>
        </div>

        <button
          className="profile-settings"
          onClick={openSettings}
          title="Settings"
          aria-label="Open settings"
        >
          <i className="fa-solid fa-gear"></i>
        </button>

        <button
          className="profile-logout"
          onClick={logout}
          title="Log out"
          aria-label="Log out"
        >
          &#8617;
        </button>

      </div>

    </section>
  )
}

export default Sidebar;