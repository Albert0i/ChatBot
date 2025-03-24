/**
 * This demo Node.js script shows how you can use sqlite-vec with
 * the new builtin node:sqlite module.
 * Note that this requires Node v23.5.0 or above.
 */
import { DatabaseSync } from "node:sqlite";
import { documents } from '../data/documents100.js'
import { convertFloat32ArrayToUint8Array, convertUint8ArrayToFloatArray} from './util.js'
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

function findSimilarDocuments(embedding, count = 3) {
    const insertStmt = db.prepare(`INSERT INTO vec_scores(id, embedding_score) 
                                   VALUES (?, ?)`);                                   
    // Fetch all embeddings and calculate cosine similarity one by one 
    const docs = db.prepare(`SELECT id, embedding FROM vec_docs`).all();
    docs.forEach(doc => {        
        // And insert into score table accordingly...
        insertStmt.run(BigInt(doc.id), 
                       embedding.calculateCosineSimilarity(convertUint8ArrayToFloatArray(doc.embedding)));

        // insertStmt.run(BigInt(doc.id), 
        //                calculateCosineSimilarity(embedding.vector, convertUint8ArrayToFloatArray(doc.embedding)));
        // insertStmt.run(BigInt(doc.id), 
        //                calculateDotProduct(embedding.vector, convertUint8ArrayToFloatArray(doc.embedding)));
        // insertStmt.run(BigInt(doc.id), 
        //                calculateEuclideanDistance(embedding.vector, convertUint8ArrayToFloatArray(doc.embedding)));
    })

    // Perform a KNN query like so:
    const selectStmt = `SELECT f1.id, f1.document, f2.embedding_score
                        FROM vec_docs f1, vec_scores f2 
                        WHERE f1.id = f2.id
                        ORDER BY f2.embedding_score DESC 
                        LIMIT ${count} OFFSET 0`;

    return db.prepare(selectStmt).all();
}

await embedDocuments(documents);

/*
   main
*/
const query = "What is the tallest mountain on Earth?";
const queryEmbedding = await context.getEmbeddingFor(query);

const similarDocuments = findSimilarDocuments(queryEmbedding);

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