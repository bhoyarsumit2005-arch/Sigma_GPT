import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import chatRoutes from "./routes/chat.js";

<<<<<<< HEAD

const app = express();
const PORT =8080;
=======
const app = express();
const PORT = 8080;
>>>>>>> 32886bdf96754e13bbb2c74c5f9ea3d9abed4a96

app.use(express.json());
app.use(cors());

<<<<<<< HEAD
app.use("/api",chatRoutes);

app.get("/api/ping", (req, res) => {
    res.send("pong");
});

const connectDB = async() =>{
    try{
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected with Database!");
    } catch(err) {
        console.log("Failed to connect with Db",err);
    }
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

connectDB();

// app.post("/test",async (req, res) => {
//     const options = {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json",
//             "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
//         },
//         body:JSON.stringify({
//             model:"gpt-4o-mini",
//             messages:[{role:"user", content:req.body.message}]
//         })
//     };

//     try {
//     const response = await fetch("https://api.openai.com/v1/chat/completions",options);
//     const data = await response.json();
//     // console.log(data);
//     res.send(data.choices[0].message.content);
//     } catch(err) {
//         console.log(err);
        
//     }
// });



=======
app.use("/api", chatRoutes);

app.listen(PORT, () => {
    console.log(`server running on ${PORT}`);
    connectDB();
});

const connectDB = async() => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected with Database!");
    } catch(err) {
        console.log("Failed to connect with Db", err);
    }
}
>>>>>>> 32886bdf96754e13bbb2c74c5f9ea3d9abed4a96
