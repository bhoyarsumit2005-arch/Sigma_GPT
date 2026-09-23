import "./Sidebar.css";
import { useContext, useEffect } from "react";
<<<<<<< HEAD
import {MyContext} from "./MyContext.jsx";
import {v1 as uuidv1} from "uuid";

function Sidebar() {
  const {allThreads,setAllThreads,currThreadId, setNewChat, setPrompt, setReply, setCurrThreadId, setPrevChats, setError} = useContext(MyContext);

  const getAllThreads = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/thread");
      const res =await response.json();
      const filteredData = res.map(thread =>({threadId: thread.threadId, title: thread.title}));
      //console.log(filteredData);
      setAllThreads(filteredData);
    } catch(err) {
      console.log(err);
    }
  
  };

  useEffect(() => {
    getAllThreads();
  }, [currThreadId])

  const createNewChat = () => {
    setNewChat(true);
    setPrompt("");
    setReply(null);
    setError(null);
    setCurrThreadId(uuidv1());
    setPrevChats([]);
  }

  const changeThread = async (newThreadId) => {
    setCurrThreadId(newThreadId);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8080/api/thread/${newThreadId}`);
      const res = await response.json();
      console.log(res);
      setPrevChats(Array.isArray(res) ? res : []);
      setNewChat(false);
      setReply(null);
    } catch(err) {
      console.log(err);
    }
  }


  const deleteThread = async (threadId) => {
    try {
      const response = await fetch(`http://localhost:8080/api/thread/${threadId}`,{method:"DELETE"});
      const res = await response.json();
      console.log(res);
    
      //updates threads re-render
      setAllThreads(prev => prev.filter(thread => thread.threadId !== threadId));

      if(threadId === currThreadId) {
        createNewChat();
      }

    } catch(err){
      console.log(err);
    }
  }


  return (
   <section className="sidebar">
    {/* new chat button*/}
    <button  onClick={createNewChat}>
      <img src="src/assets/blacklogo.png" alt="gpt logo" className="logo"/>
      
      <span><i className="fa-solid fa-pen-to-square"></i></span>
    
    </button>
    {/* history */}
    <ul className="history">
      {
        allThreads?.map((thread, idx) => (
          <li key={idx}
                  onClick={() => changeThread(thread.threadId)}
                  className={thread.threadId === currThreadId ? "highlighted": ""}
          >
             {thread.title}
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

    {/* sign */}
    <div className="sign">
      <p>By Sumit &hearts;</p>
    </div>

   </section>
  )
=======
import { MyContext } from "./MyContext.jsx";
import {v1 as uuidv1} from "uuid";

function Sidebar() {
    const {allThreads, setAllThreads, currThreadId, setNewChat, setPrompt, setReply, setCurrThreadId, setPrevChats} = useContext(MyContext);

    const getAllThreads = async () => {
        try {
            const response = await fetch("http://localhost:8080/api/thread");
            const res = await response.json();
            const filteredData = res.map(thread => ({threadId: thread.threadId, title: thread.title}));
            //console.log(filteredData);
            setAllThreads(filteredData);
        } catch(err) {
            console.log(err);
        }
    };

    useEffect(() => {
        getAllThreads();
    }, [currThreadId])


    const createNewChat = () => {
        setNewChat(true);
        setPrompt("");
        setReply(null);
        setCurrThreadId(uuidv1());
        setPrevChats([]);
    }

    const changeThread = async (newThreadId) => {
        setCurrThreadId(newThreadId);

        try {
            const response = await fetch(`http://localhost:8080/api/thread/${newThreadId}`);
            const res = await response.json();
            console.log(res);
            setPrevChats(res);
            setNewChat(false);
            setReply(null);
        } catch(err) {
            console.log(err);
        }
    }   

    const deleteThread = async (threadId) => {
        try {
            const response = await fetch(`http://localhost:8080/api/thread/${threadId}`, {method: "DELETE"});
            const res = await response.json();
            console.log(res);

            //updated threads re-render
            setAllThreads(prev => prev.filter(thread => thread.threadId !== threadId));

            if(threadId === currThreadId) {
                createNewChat();
            }

        } catch(err) {
            console.log(err);
        }
    }

    return (
        <section className="sidebar">
            <button onClick={createNewChat}>
                <img src="src/assets/blacklogo.png" alt="gpt logo" className="logo"></img>
                <span><i className="fa-solid fa-pen-to-square"></i></span>
            </button>


            <ul className="history">
                {
                    allThreads?.map((thread, idx) => (
                        <li key={idx} 
                            onClick={(e) => changeThread(thread.threadId)}
                            className={thread.threadId === currThreadId ? "highlighted": " "}
                        >
                            {thread.title}
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
 
            <div className="sign">
                <p>By Sumit Bhoyar &hearts;</p>
            </div>
        </section>
    )
>>>>>>> 32886bdf96754e13bbb2c74c5f9ea3d9abed4a96
}

export default Sidebar;