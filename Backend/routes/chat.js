import express from "express";
<<<<<<< HEAD
// import crypto from "crypto";
import Thread from "../models/Thread.js";
// import { threadId } from "worker_threads";
=======
import Thread from "../models/Thread.js";
>>>>>>> 32886bdf96754e13bbb2c74c5f9ea3d9abed4a96
import getOpenAIAPIResponse from "../utils/openai.js";

const router = express.Router();

<<<<<<< HEAD
router.get("/hello", (req, res) => {
    res.send("Chat router is working!");
});

router.get("/test", async (req, res) => {
    try {
        const thread = new Thread({
            threadId:"qwe",
            title: "Testing new Thread"
        });

        const response = await thread.save();

        res.send(response);
    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: "Failed to save in DB"
        });
    }
});

router.post("/test", async (req, res) => {
    try {
        const thread = new Thread({
            threadId:"123",
            title: "Testing new Thread"
        });

        const response = await thread.save();

        res.send(response);
    } catch (err) {
        console.log(err);
        res.status(500).json({
            error: "Failed to save in DB"
        });
    }
});

//get all threads

router.get("/thread", async(req , res) => {
    try{
        const threads = await Thread.find({}).sort({updatedAt:-1});
        //descending order of updateAt...most recent data on top
        res.json(threads);
    } catch(err) {
        console.log(err);
        res.status(500).json({error:"Failed to fetch threads"});
    }
});


router.get("/thread/:threadId", async(req , res) =>{
    const{threadId} =req.params;

    try{
        let thread = await Thread.findOne({threadId});

        if(!thread){
            return res.status(404).json({error:"Thread not found"});
        }
        return res.json(thread.messages);
    } catch(err){
        console.log(err);
        res.status(500).json({error:"Failed to fetch data"});
    }
});

router.delete("/thread/:threadId", async (req,res) => {
      const {threadId} = req.params;

    try{
        const deletedThread = await Thread.findOneAndDelete({threadId});

        if(! deletedThread) {
            return res.status(404).json({error:"Thread not Found"});
        }

        return res.status(200).json({success :"Thread deleted successfully"});

    } catch(err) {
        console.log(err);
         res.status(500).json({error:"Failed to delete thread"});
    }
});

router.post("/chat", async(req, res) =>{
    const {threadId ,message} = req.body;

    if(!threadId || !message){
        return res.status(400).json({error: "missing required fields "});
    }

    try{
        const thread = await Thread.findOne({threadId});

        let newThread;
        if(!thread){
            newThread = new Thread({
                threadId,
                title:message,
                messages:[{role:"user",content:message}]
            });
        }  else{
            thread.messages.push({role:"user",content:message});
        }

    const assistantReply = await getOpenAIAPIResponse(message);

    const target = newThread || thread;
    target.messages.push({role:"assistant",content:assistantReply});
    target.updatedAt = new Date();

    await target.save();
    
    res.json({reply:assistantReply});
    } catch(err){
        console.log(err);
        res.status(500).json({error: err.message || "something went wrong"});
=======
//test
router.post("/test", async(req, res) => {
    try {
        const thread = new Thread({
            threadId: "abc",
            title: "Testing New Thread2"
        });

        const response = await thread.save();
        res.send(response);
    } catch(err) {
        console.log(err);
        res.status(500).json({error: "Failed to save in DB"});
    }
});

//Get all threads
router.get("/thread", async(req, res) => {
    try {
        const threads = await Thread.find({}).sort({updatedAt: -1});
        //descending order of updatedAt...most recent data on top
        res.json(threads);
    } catch(err) {
        console.log(err);
        res.status(500).json({error: "Failed to fetch threads"});
    }
});

router.get("/thread/:threadId", async(req, res) => {
    const {threadId} = req.params;

    try {
        const thread = await Thread.findOne({threadId});

        if(!thread) {
            res.status(404).json({error: "Thread not found"});
        }

        res.json(thread.messages);
    } catch(err) {
        console.log(err);
        res.status(500).json({error: "Failed to fetch chat"});
    }
});

router.delete("/thread/:threadId", async (req, res) => {
    const {threadId} = req.params;

    try {
        const deletedThread = await Thread.findOneAndDelete({threadId});

        if(!deletedThread) {
            res.status(404).json({error: "Thread not found"});
        }

        res.status(200).json({success : "Thread deleted successfully"});

    } catch(err) {
        console.log(err);
        res.status(500).json({error: "Failed to delete thread"});
    }
});

router.post("/chat", async(req, res) => {
    const {threadId, message} = req.body;

    if(!threadId || !message) {
        res.status(400).json({error: "missing required fields"});
    }

    try {
        let thread = await Thread.findOne({threadId});

        if(!thread) {
            //create a new thread in Db
            thread = new Thread({
                threadId,
                title: message,
                messages: [{role: "user", content: message}]
            });
        } else {
            thread.messages.push({role: "user", content: message});
        }

        const assistantReply = await getOpenAIAPIResponse(message);

        thread.messages.push({role: "assistant", content: assistantReply});
        thread.updatedAt = new Date();

        await thread.save();
        res.json({reply: assistantReply});
    } catch(err) {
        console.log(err);
        res.status(500).json({error: "something went wrong"});
>>>>>>> 32886bdf96754e13bbb2c74c5f9ea3d9abed4a96
    }
});


<<<<<<< HEAD
export default router;
=======


export default router;
>>>>>>> 32886bdf96754e13bbb2c74c5f9ea3d9abed4a96
