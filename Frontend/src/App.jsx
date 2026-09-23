<<<<<<< HEAD
import { useState } from 'react';
import './App.css'
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import { MyContext } from './MyContext.jsx';
=======
import './App.css';
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import {MyContext} from "./MyContext.jsx";
import { useState } from 'react';
>>>>>>> 32886bdf96754e13bbb2c74c5f9ea3d9abed4a96
import {v1 as uuidv1} from "uuid";

function App() {
  const [prompt, setPrompt] = useState("");
<<<<<<< HEAD
  const [reply, setReply] =useState(null);
  const [currThreadId,setCurrThreadId]=useState(uuidv1());
  const [prevChats, setPrevChats] = useState([]) ; //stores all chat of curr threads
  const [newChat , setNewChat] = useState(true);
  const [allThreads, setAllThreads] = useState([]);
  const [error, setError] = useState(null);
  

  const providerValues = {
    prompt , setPrompt,
    reply,setReply,
    currThreadId,setCurrThreadId,
    newChat, setNewChat,
    prevChats,setPrevChats,
    allThreads,setAllThreads,
    error,setError
  };
 

  return (
    <div className='app'>
      <MyContext.Provider value = {providerValues}>
      <Sidebar></Sidebar>
      <ChatWindow></ChatWindow>
      </MyContext.Provider>
=======
  const [reply, setReply] = useState(null);
  const [currThreadId, setCurrThreadId] = useState(uuidv1());
  const [prevChats, setPrevChats] = useState([]); //stores all chats of curr threads
  const [newChat, setNewChat] = useState(true);
  const [allThreads, setAllThreads] = useState([]);

  const providerValues = {
    prompt, setPrompt,
    reply, setReply,
    currThreadId, setCurrThreadId,
    newChat, setNewChat,
    prevChats, setPrevChats,
    allThreads, setAllThreads
  }; 

  return (
    <div className='app'>
      <MyContext.Provider value={providerValues}>
          <Sidebar></Sidebar>
          <ChatWindow></ChatWindow>
        </MyContext.Provider>
>>>>>>> 32886bdf96754e13bbb2c74c5f9ea3d9abed4a96
    </div>
  )
}

<<<<<<< HEAD
export default App;
=======
export default App
>>>>>>> 32886bdf96754e13bbb2c74c5f9ea3d9abed4a96
