import express from "express";
// import crypto from "crypto";
import Thread from "../models/Thread.js";
// import { threadId } from "worker_threads";
import getOpenAIAPIResponse from "../utils/openai.js";

const router = express.Router();

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
    }
});


export default router;
