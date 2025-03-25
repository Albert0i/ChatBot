/**
 * This demo Node.js script shows how you can use sqlite-vec with
 * the new builtin node:sqlite module.
 * Note that this requires Node v23.5.0 or above.
 */
import { DatabaseSync } from "node:sqlite";
import * as sqliteVec from "sqlite-vec";
import { documents } from '../src/models/documents.js'
import { convertFloat32ArrayToUint8Array } from './util.js'
import {fileURLToPath} from "url";
import path from "path";
import {getLlama} from "node-llama-cpp";

import readline from 'readline';
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const __dirname = path.dirname(
    fileURLToPath(import.meta.url)
);

const llama = await getLlama();
const model = await llama.loadModel({
    modelPath: path.join(__dirname, "models", "bge-small-en-v1.5-f32.gguf")
});
const context = await model.createEmbeddingContext();

// allExtension is required to enable extension support
const db = new DatabaseSync(":memory:", { allowExtension: true });
sqliteVec.load(db);

const { sqlite_version, vec_version } = db
  .prepare(
    "SELECT sqlite_version() AS sqlite_version, vec_version() AS vec_version;",
  )
  .get();
console.log()  
console.log(`sqlite_version=${sqlite_version}, vec_version=${vec_version}`);
db.exec(`CREATE VIRTUAL TABLE vec_items USING vec0 (
            id integer primary key, 

            -- Auxiliary columns, unindexed but fast lookups
            document text, 

            -- Vector text embedding of the 'document' column, with 384 dimensions
            embedding float[384]
        )`);

async function embedDocuments(documents) {
    const insertStmt = db.prepare(`INSERT INTO vec_items(id, document, embedding) 
                                   VALUES (?, ?, ?)`);

    documents.forEach(async (document, index) => {        
        const { vector } = await context.getEmbeddingFor(document);        
        // node:sqlite requires Uint8Array for BLOB values, so a bit awkward
        insertStmt.run(BigInt(index + 1), document, convertFloat32ArrayToUint8Array(vector));
        // console.debug(
        //     `${index + 1} / ${documents.length} documents embedded`
        // );
    })
}

function findSimilarDocuments(embedding, count = 10) {
    // Perform a KNN query like so:
    const rows = db
          .prepare(`SELECT id, document, distance
                    FROM vec_items
                    WHERE embedding MATCH ? AND k=${count}
                    ORDER BY distance`)
          .all(new Uint8Array(new Float32Array(embedding.vector).buffer));
    
    return rows; 
}

console.log('Please wait while loading...')
await embedDocuments(documents);
findSimilarDocuments(await context.getEmbeddingFor('sample'));

/*
   main
*/
const askQuestion = () => {
    rl.question('Input: ', async (query) => {
        const queryEmbedding = await context.getEmbeddingFor(query);
        const similarDocuments = findSimilarDocuments(queryEmbedding);
        
        for (let i = 0; i < similarDocuments.length; i++) {
            console.log(`Element[${i+1}]: ${similarDocuments[i].document}, ${similarDocuments[i].distance}`);
        }

        askQuestion(); // Recurse to ask the question again
    });
};

askQuestion();

/*
   Using Embedding
   Finding Relevant Documents
   https://github.com/withcatai/node-llama-cpp/blob/master/docs/guide/embedding.md

   sqlite-vec
   https://github.com/asg017/sqlite-vec
*/
