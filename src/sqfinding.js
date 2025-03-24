/**
 * This demo Node.js script shows how you can use sqlite-vec with
 * the new builtin node:sqlite module.
 * Note that this requires Node v23.5.0 or above.
 */
import { DatabaseSync } from "node:sqlite";
import * as sqliteVec from "sqlite-vec";
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

await embedDocuments(documents);

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