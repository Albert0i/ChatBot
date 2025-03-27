import 'dotenv/config'
import { runSelectSQL, runSQL } from './util/yrunner.js'

import { DatabaseSync } from "node:sqlite";
import { convertFloatArrayToArray } from './util/helper.js'
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
console.log(`sqlite_version = ${sqlite_version}`);

const result = await runSelectSQL('SELECT banner FROM v$version')
if (result.success)
    result.rows.forEach(row => console.log(`oracle_version = ${row.BANNER}`))

await runSQL([
                `ALTER SESSION SET current_schema = ${process.env.NODE_ORACLEDB_USER}`
            ])

db.exec(`CREATE TABLE vec_scores (
            id INTEGER PRIMARY KEY,
            document TEXT, 
            score FLOAT
         ); 
         CREATE INDEX idx_vec_scores ON vec_scores (score);
       `); 

const maxBuffer = 1000
async function findSimilarDocuments(embedding, count = 10) {
    const insertStmt = db.prepare(`INSERT INTO vec_scores(id, document, score) 
                                   VALUES (?, ?, ?)`);
    let counter = 0; 
    db.prepare('DELETE FROM vec_scores').run();
    // Fetch all embeddings and calculate cosine similarity one by one 
    const result = await runSelectSQL('SELECT id, document, embedding FROM vec_items')
    if (result.success)
        result.rows.forEach(row => {
                                        insertStmt.run(BigInt(row.ID), 
                                                       row.DOCUMENT, 
                                                       embedding.calculateCosineSimilarity(convertFloatArrayToArray(row.EMBEDDING))); 
                                        counter++; 
                                        if ((counter / maxBuffer) === Math.floor(counter / maxBuffer)) {
                                            //console.log('Trimming temp table to conserve memory...')
                                            db.prepare(`DELETE from vec_scores 
                                                        WHERE id NOT in 
                                                            (SELECT id
                                                                FROM vec_scores 
                                                                ORDER BY score DESC 
                                                                LIMIT ${maxBuffer} OFFSET 0)`).run()
                                        }
                                   })

    // Perform a KNN query like so:
    const selectStmt = `SELECT id, document, score
                        FROM vec_scores 
                        ORDER BY score DESC 
                        LIMIT ${count} OFFSET 0`;
    
    return db.prepare(selectStmt).all();
}

/*
   main
*/
console.log()
const askQuestion = () => {    
    rl.question('Input: ', async (query) => {
        const queryEmbedding = await context.getEmbeddingFor(query);
        const similarDocuments = await findSimilarDocuments(queryEmbedding);
        
        for (let i = 0; i < similarDocuments.length; i++) {
            console.log(`Element[${i+1}]: ${similarDocuments[i].document}, ${similarDocuments[i].score}`);
        }
        console.log()
        askQuestion(); // Recurse to ask the question again
    });
};

askQuestion();

/*
   Using Embedding
   Finding Relevant Documents
   https://github.com/withcatai/node-llama-cpp/blob/master/docs/guide/embedding.md
*/
