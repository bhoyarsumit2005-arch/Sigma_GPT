import "dotenv/config";
import mongoose from "mongoose";
import Thread from "../models/Thread.js";

//threads created before user-scoping existed have no owner field.
//They are reported (and optionally deleted) — never assigned to anyone.
const ORPHAN_FILTER = {
    $or: [{ userId: { $exists: false } }, { userId: null }],
};

const args = process.argv.slice(2);
const deleteOrphans = args.includes("--delete-orphans");
const syncIndexes = args.includes("--sync-indexes");

async function run() {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is missing in Backend/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const orphans = await Thread.find(ORPHAN_FILTER)
        .select("threadId title createdAt")
        .lean();

    console.log(`Threads without an owner: ${orphans.length}`);
    orphans.forEach((thread) => {
        console.log(
            ` - threadId=${thread.threadId} | title=${thread.title} | created=${thread.createdAt}`
        );
    });

    if (orphans.length > 0 && !deleteOrphans) {
        console.log("");
        console.log("No data was changed. Orphan threads are never assigned to a user.");
        console.log("To remove them: npm run migrate:threads -- --delete-orphans");
    }

    if (deleteOrphans && orphans.length > 0) {
        const result = await Thread.deleteMany(ORPHAN_FILTER);
        console.log(`Deleted ${result.deletedCount} orphan thread(s).`);
    }

    if (syncIndexes) {
        try {
            await Thread.syncIndexes();
            console.log(
                "Indexes synced: old threadId-only unique index dropped, (userId, threadId) unique index created."
            );
        } catch (err) {
            console.error("Index sync failed:", err.message);
            console.log(
                "This usually means two documents share the same threadId. Remove the duplicates, then re-run."
            );
        }
    } else {
        console.log("");
        console.log(
            "Run once with --sync-indexes to drop the old threadId-only unique index"
        );
        console.log(
            "and create the new (userId, threadId) unique index: npm run migrate:threads -- --sync-indexes"
        );
    }

    await mongoose.disconnect();
}

run().catch((err) => {
    console.error("Migration failed:", err.message);
    process.exit(1);
});
