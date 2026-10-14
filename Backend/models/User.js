import mongoose from "mongoose";

//One entry per signed-in device. The session id (`sid`) is embedded in the JWT
//so the server can actually revoke a specific device instead of pretending a
//stateless cookie can be un-sent.
const sessionSchema = new mongoose.Schema(
    {
        sid: {
            type: String,
            required: true,
        },

        userAgent: {
            type: String,
            default: "",
            maxlength: 400,
        },

        ip: {
            type: String,
            default: "",
            maxlength: 100,
        },

        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: 254,
        },

        password: {
            type: String,
            required: true,
            //never selected unless a query explicitly asks with .select("+password")
            select: false,
        },

        //UI preference, persisted per account and re-applied on startup
        theme: {
            type: String,
            enum: ["dark", "light", "system"],
            default: "dark",
        },

        //active login sessions; hidden from normal queries so it can never leak
        sessions: {
            type: [sessionSchema],
            default: [],
            select: false,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("User", userSchema);
