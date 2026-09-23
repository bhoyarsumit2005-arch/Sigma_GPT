import "./Chat.css";
<<<<<<< HEAD
import { useContext, useState, useEffect } from "react";
=======
import React, { useContext, useState, useEffect } from "react";
>>>>>>> 32886bdf96754e13bbb2c74c5f9ea3d9abed4a96
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
<<<<<<< HEAD
//react-markdown
//rehype-highlight

function Chat() {
  const {newChat, prevChats,reply} = useContext(MyContext);
  const [letestReply, setLetestReply] = useState(null);

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
  

  return (
   <>
    {newChat && <h1>Start a New Chat!</h1>}
    <div className="chats">
      {
        prevChats?.slice(0,-1).map((chat, idx) =>
        <div className={chat.role ==="user"? "userDiv" : "gptDiv"} key={idx}>
          {
            chat.role ==="user"?
            <p className="userMessage"> {chat.content}</p> :
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{String(chat.content ?? "")}</ReactMarkdown>
          }
          </div>
        )
      }


      {
         prevChats?.length > 0 && (
          <>
             {
                letestReply === null ? (
                  <div className="gptDiv" key={"non-typing"}>
                   <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{String(prevChats[prevChats.length-1]?.content ?? "")}</ReactMarkdown>
                   </div>
                ) : (
                   <div className="gptDiv" key={"typing"}>
                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{String(letestReply ?? "")}</ReactMarkdown>
                  </div>
                )
             }


          </>
         )
      }

      
    </div>
   
    
   </>
  )
=======

function Chat() {
    const {newChat, prevChats, reply} = useContext(MyContext);
    const [latestReply, setLatestReply] = useState(null);

    useEffect(() => {
        if(reply === null) {
            setLatestReply(null); //prevchat load
            return;
        }

        if(!prevChats?.length) return;

        const content = reply.split(" "); //individual words

        let idx = 0;
        const interval = setInterval(() => {
            setLatestReply(content.slice(0, idx+1).join(" "));

            idx++;
            if(idx >= content.length) clearInterval(interval);
        }, 40);

        return () => clearInterval(interval);

    }, [prevChats, reply])

    return (
        <>
            {newChat && <h1>Start a New Chat!</h1>}
            <div className="chats">
                {
                    prevChats?.slice(0, -1).map((chat, idx) => 
                        <div className={chat.role === "user"? "userDiv" : "gptDiv"} key={idx}>
                            {
                                chat.role === "user"? 
                                <p className="userMessage">{chat.content}</p> : 
                                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{chat.content}</ReactMarkdown>
                            }
                        </div>
                    )
                }

                {
                    prevChats.length > 0  && (
                        <>
                            {
                                latestReply === null ? (
                                    <div className="gptDiv" key={"non-typing"} >
                                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{prevChats[prevChats.length-1].content}</ReactMarkdown>
                                </div>
                                ) : (
                                    <div className="gptDiv" key={"typing"} >
                                     <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{latestReply}</ReactMarkdown>
                                </div>
                                )

                            }
                        </>
                    )
                }

            </div>
        </>
    )
>>>>>>> 32886bdf96754e13bbb2c74c5f9ea3d9abed4a96
}

export default Chat;