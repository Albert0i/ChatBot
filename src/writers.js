/**
 * This demo Node.js script shows how you can use sqlite-vec with
 * the new builtin node:sqlite module.
 * Note that this requires Node v23.5.0 or above.
 */
import { DatabaseSync } from "node:sqlite";
import { writers } from '../data/writers100.js'
import { convertUint8ArrayToFloatArray } from './util/helper.js'
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
    modelPath: path.join(__dirname, "models", "paraphrase-MiniLM-L6-v2.i1-IQ1_S.gguf")
});
const context = await model.createEmbeddingContext();

const db = new DatabaseSync(":memory:");

const { sqlite_version } = db
  .prepare(
    "SELECT sqlite_version() AS sqlite_version;",
  )
  .get();
console.log()  
console.log(`sqlite_version=${sqlite_version}`);

db.exec(`CREATE TABLE vec_items (
                id INTEGER PRIMARY KEY, 
                document TEXT, 

                -- Vector text embedding of the 'document' column, with 384 dimensions
                embedding FLOAT[384]
         )`);
db.exec(`CREATE TABLE vec_scores (
            id INTEGER PRIMARY KEY,
            embedding_score FLOAT
         ); 
         CREATE INDEX idx_vec_scores ON vec_scores (embedding_score);
       `); 

async function embedDocuments(documents) {
    const insertStmt = db.prepare(`INSERT INTO vec_items(id, document, embedding) 
                                   VALUES (?, ?, ?)`);

    documents.forEach(async (document, index) => {        
        const { vector } = await context.getEmbeddingFor(document);        
        // node:sqlite requires Uint8Array for BLOB values, so a bit awkward
        insertStmt.run(BigInt(index + 1), document, convertFloat32ArrayToUint8Array(vector));
        console.debug(
            `${index + 1} / ${documents.length} documents embedded`
        );
    })
}

function findSimilarDocuments(embedding, count = 3) {
    const insertStmt = db.prepare(`INSERT INTO vec_scores(id, embedding_score) 
                                   VALUES (?, ?)`);
    // Fetch all embeddings and calculate cosine similarity one by one 
    const docs = db.prepare(`SELECT id, embedding FROM vec_items`).all();
    docs.forEach(doc => {        
        // And insert into score table accordingly...
        insertStmt.run(BigInt(doc.id), 
                       embedding.calculateCosineSimilarity(convertUint8ArrayToFloatArray(doc.embedding)));
    })

    // Perform a KNN query like so:
    const selectStmt = `SELECT f1.id, f1.document, f2.embedding_score
                        FROM vec_items f1, vec_scores f2 
                        WHERE f1.id = f2.id
                        ORDER BY f2.embedding_score DESC 
                        LIMIT ${count} OFFSET 0`;

    return db.prepare(selectStmt).all();
}

await embedDocuments(writers);
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
