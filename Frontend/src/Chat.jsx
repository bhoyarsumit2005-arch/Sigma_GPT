import "./Chat.css";
import { useContext, useState, useEffect, useRef } from "react";
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
//react-markdown
//rehype-highlight

const SUGGESTIONS = [
  {
    icon: "🧠",
    title: "Explain Concepts",
    sub: "Clear answers, simple words",
  },
  {
    icon: "💻",
    title: "Write Code",
    sub: "Any language, any task",
  },
  {
    icon: "📚",
    title: "Study Notes",
    sub: "Summaries & learning plans",
  },
  {
    icon: "⚡",
    title: "Build Projects",
    sub: "Ideas to working code",
  },
];

function AssistantCard({children}) {
  return (
    <div className="message-row assistant">
      <div className="assistant-avatar">&#931;</div>
      <div className="message-content">
        <div className="assistant-info">
          <span className="assistant-name">Sigma AI</span>
          <span className="assistant-badge">AI</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function Chat({loading}) {
  const {newChat, prevChats, reply} = useContext(MyContext);
  const [letestReply, setLetestReply] = useState(null);
  const chatsRef = useRef(null);

  useEffect(()=>{

    if(reply === null || typeof reply !== "string"){
      setLetestReply(null);
      return;
    }

    //letestReply separate => typing effect create
    if(!prevChats?.length) return;

    const content = reply.split(" ");//individual words

    let idx = 0;
    const interval = setInterval(()=>{
      setLetestReply(content.slice(0, idx+1).join(" "));

      idx++;
      if(idx >= content.length) clearInterval(interval);
    },40);

    return () =>clearInterval(interval);
  }, [prevChats,reply])

  //auto scroll to latest message
  useEffect(() => {
    const el = chatsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [prevChats, letestReply, loading]);

  const showWelcome = newChat && prevChats?.length === 0;

  if (showWelcome) {
    return (
      <div className="chat-main">
        <div className="welcome-screen">
          <div className="welcome-icon">&#931;</div>
          <h1>Think. Create. Build.</h1>
          <p>Your intelligent workspace for ideas, code and learning.</p>

          <div className="suggestions">
            {SUGGESTIONS.map((s, idx) => (
              <div className="suggestion-card" key={idx}>
                <span className="s-emoji">{s.icon}</span>
                <strong>{s.title}</strong>
                <small>{s.sub}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-main">
      <div className="chats" ref={chatsRef}>
        {
          prevChats?.slice(0,-1).map((chat, idx) =>
            chat.role === "user" ? (
              <div className="message-row user" key={idx}>
                <div className="message-content">{chat.content}</div>
              </div>
            ) : (
              <AssistantCard key={idx}>
                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{String(chat.content ?? "")}</ReactMarkdown>
              </AssistantCard>
            )
          )
        }


        {
           prevChats?.length > 0 && (
            <>
               {
                  letestReply === null ? (
                    <AssistantCard key={"non-typing"}>
                      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{String(prevChats[prevChats.length-1]?.content ?? "")}</ReactMarkdown>
                    </AssistantCard>
                  ) : (
                     <AssistantCard key={"typing"}>
                      <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{String(letestReply ?? "")}</ReactMarkdown>
                    </AssistantCard>
                  )
               }


            </>
           )
        }

        {
          loading && (
            <div className="message-row assistant" key={"loader"}>
              <div className="assistant-avatar">&#931;</div>
              <div className="message-content typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )
        }

      </div>
    </div>
  )
}

export default Chat;
