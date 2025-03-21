/**
 * This demo Node.js script shows how you can use sqlite-vec with
 * the new builtin node:sqlite module.
 * Note that this requires Node v23.5.0 or above.
 */
import { DatabaseSync } from "node:sqlite";
import * as sqliteVec from "sqlite-vec";

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
            document text, 
            embedding float[384]
        )`);

async function embedDocuments(documents) {
    const insertStmt = db.prepare(`INSERT INTO vec_items(id, document, embedding) 
                                   VALUES (?, ?, ?)`);

    documents.forEach(async (document, index) => {        
        const { vector } = await context.getEmbeddingFor(document);        
        // node:sqlite requires Uint8Array for BLOB values, so a bit awkward
        insertStmt.run(BigInt(index), document, new Uint8Array(new Float32Array(vector).buffer));
        console.debug(
            `${index + 1} / ${documents.length} documents embedded`
        );
    })
}

function findSimilarDocuments(embedding) {
    const rows = db
          .prepare(`SELECT id, document, distance
                    FROM vec_items
                    WHERE embedding MATCH ?
                    ORDER BY distance
                    LIMIT 3`)
          .all(new Uint8Array(new Float32Array(embedding.vector).buffer));
    
    return rows; 
}

await embedDocuments([
    "The sky is clear and blue today",
    "I love eating pizza with extra cheese",
    "Dogs love to play fetch with their owners",
    "The capital of France is Paris",
    "Drinking water is important for staying hydrated",
    "Mount Everest is the tallest mountain in the world",
    "A warm cup of tea is perfect for a cold winter day",
    "Painting is a form of creative expression",
    "Not all the things that shine are made of gold",
    "Cleaning the house is a good way to keep it tidy"
]);

/*
   main
*/
const query = "What is the tallest mountain on Earth?";
const queryEmbedding = await context.getEmbeddingFor(query);

const similarDocuments = findSimilarDocuments(queryEmbedding);

console.log()
console.log("First matched document:", similarDocuments[0].document, similarDocuments[0].distance );
console.log("Second matched document:", similarDocuments[1].document, similarDocuments[1].distance );
console.log("Third matched document:", similarDocuments[2].document, similarDocuments[2].distance );

/*
   Using Embedding
   Finding Relevant Documents
   https://github.com/withcatai/node-llama-cpp/blob/master/docs/guide/embedding.md

   sqlite-vec
   https://github.com/asg017/sqlite-vec
*/