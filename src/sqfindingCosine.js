/**
 * This demo Node.js script shows how you can use sqlite-vec with
 * the new builtin node:sqlite module.
 * Note that this requires Node v23.5.0 or above.
 */
import { DatabaseSync } from "node:sqlite";
import { documents } from '../data/documents100.js'

import {fileURLToPath} from "url";
import path from "path";
import {getLlama} from "node-llama-cpp";

const __dirname = path.dirname(
    fileURLToPath(import.meta.url)
);

const llama = await getLlama();
const model = await llama.loadModel({
    modelPath: path.join(__dirname, "models", "bge-small-en-v1.5-f32.gguf")
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

db.exec(`CREATE TABLE vec_docs (
                id INTEGER PRIMARY KEY, 
                document TEXT, 
                embedding FLOAT[384]
         )`);
db.exec(`CREATE TABLE vec_scores (
                id INTEGER PRIMARY KEY,
                embedding_score FLOAT
         ); 
         CREATE INDEX idx_vec_scores ON vec_scores (embedding_score);
         `); 

async function embedDocuments(documents) {
    const insertStmt = db.prepare(`INSERT INTO vec_docs(id, document, embedding) 
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

// node:sqlite requires Uint8Array for BLOB values, so a bit awkward
// Function to convert Float32Array to Uint8Array
function convertFloat32ArrayToUint8Array(floatArray) {
    return new Uint8Array(new Float32Array(floatArray).buffer);
}

// Function to convert Uint8Array back to array of floats
function convertUint8ArrayToFloatArray(uint8Array) {
    const float32Array = new Float32Array(uint8Array.buffer);
    return Array.from(float32Array);
}

function findSimilarDocuments(embedding, count) {
    const insertStmt = db.prepare(`INSERT INTO vec_scores(id, embedding_score) 
                                   VALUES (?, ?)`);
    const selectStmt = `SELECT f1.id, f1.document, f2.embedding_score
                        FROM vec_docs f1, vec_scores f2 
                        WHERE f1.id = f2.id
                        ORDER BY f2.embedding_score DESC 
                        LIMIT ${count} OFFSET 0`;
    const docs = db.prepare(`SELECT id, embedding FROM vec_docs`).all();
    docs.forEach(doc => {        
        insertStmt.run(BigInt(doc.id), 
                       embedding.calculateCosineSimilarity(convertUint8ArrayToFloatArray(doc.embedding)));
    })

    return db.prepare(selectStmt).all();
}

await embedDocuments(documents);

/*
   main
*/
const query = "What is the tallest mountain on Earth?";
const queryEmbedding = await context.getEmbeddingFor(query);

const similarDocuments = findSimilarDocuments(queryEmbedding, 3);

console.log()
console.log("First matched document:", similarDocuments[0].document, similarDocuments[0].embedding_score );
console.log("Second matched document:", similarDocuments[1].document, similarDocuments[1].embedding_score );
console.log("Third matched document:", similarDocuments[2].document, similarDocuments[2].embedding_score );

/*
   Using Embedding
   Finding Relevant Documents
   https://github.com/withcatai/node-llama-cpp/blob/master/docs/guide/embedding.md

   sqlite-vec
   https://github.com/asg017/sqlite-vec

   Node.js v23.10.0 documentation | SQLite
   https://nodejs.org/api/sqlite.html#statementrunnamedparameters-anonymousparameters 
*/