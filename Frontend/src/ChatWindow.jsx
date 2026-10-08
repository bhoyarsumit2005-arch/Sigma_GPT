import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext ,useState} from 'react';
import {ScaleLoader} from "react-spinners";


function ChatWindow() {
  const {prompt, setPrompt, setReply, error, setError, currThreadId, setPrevChats, setNewChat} = useContext(MyContext);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const getReply = async() =>{
    const msg = prompt.trim();
    if(!msg || loading) return;

    setLoading(true);
    setNewChat(false);
    setError(null);
    setPrompt("");
    setReply(null);

    console.log("message", msg, "threadId", currThreadId);
    const options = {
      method: "POST",
      headers:{
        "Content-Type" : "application/json"
      },
      body:JSON.stringify({
        message: msg,
        threadId: currThreadId
      })
    };
    try{
      const response = await fetch("http://localhost:8080/api/chat",options);
      const res = await response.json();
      console.log(res);

      if(!response.ok || !res.reply){
        setError(res.error || "Something went wrong. Please try again.");
        return;
      }

      setReply(res.reply);
      setPrevChats(prevChats => ([
        ...prevChats,
        { role: "user", content: msg },
        { role: "assistant", content: res.reply }
      ]));
    } catch(err) {
      console.log(err);
      setError("Network error. Make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  }

  const handleProfileClick = () =>{
    setIsOpen(!isOpen);
  }

  return (
    <div className="chatWindow">
      <div className="navbar">
        <span>SigmaGPT <i className="fa-solid fa-angle-down"></i> </span>
        <div className="userIconDiv" onClick={handleProfileClick}>
             <span className="userIcon"><i className="fa-solid fa-user"></i></span>
        </div>

      </div>

     {
        isOpen &&
        <div className="dropDown">
            <div className="dropDownItem"> <i className="fa-solid fa-cloud-arrow-up"></i> Upgrade plan</div>
            <div className="dropDownItem">  <i className="fa-solid fa-gear"></i>  Settings</div>
            <div className="dropDownItem">  <i className="fa-solid fa-right-from-bracket"></i> Log out</div>
        </div>
     }

      <Chat></Chat>

      <ScaleLoader color='#fff' loading={loading}></ScaleLoader>

      {
        error && <div className="errorBanner">{error}</div>
      }

      <div className="chatInput">
        <div className="inputBox">
          <input placeholder="Ask anything"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key ==='Enter'? getReply() : ''}
          />
          <div id="submit" onClick={getReply} > <i className="fa-solid fa-paper-plane"></i></div>
        </div>
        <p className="info">
          SigmaGPT can make mistakes. Check important info . See Cookie Preference.
        </p>

      </div>
    </div>
  )
}

export default ChatWindow;