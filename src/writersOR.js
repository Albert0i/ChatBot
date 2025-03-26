/**
 * This demo Node.js script shows how you can use sqlite-vec with
 * the new builtin node:sqlite module.
 * Note that this requires Node v23.5.0 or above.
 */
import { DatabaseSync } from "node:sqlite";
import { writers } from '../data/writers100.js'
import { convertFloat32ArrayToUint8Array, convertUint8ArrayToFloatArray } from './util/helper.js'
import {fileURLToPath} from "url";
import path from "path";
import {getLlama} from "node-llama-cpp";

import 'dotenv/config'
import { runSelectSQL, runSQL } from './util/yrunner.js'

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
                `ALTER SESSION SET current_schema = ${process.env.NODE_ORACLEDB_USER}`,
                'TRUNCATE TABLE vec_items'
            ])

db.exec(`CREATE TABLE vec_scores (
            id INTEGER PRIMARY KEY,
            document TEXT, 
            score FLOAT
         ); 
         CREATE INDEX idx_vec_scores ON vec_scores (score);
       `); 

async function embedDocuments(documents) {
    documents.forEach(async (document, index) => {        
        const { vector } = await context.getEmbeddingFor(document);        

        const insertStmt = `INSERT INTO vec_items (document, embedding) VALUES ('${document}', float_array(${vector}))`
        await runSQL([insertStmt])
        
        console.debug(
            `${index + 1} / ${documents.length} "${document}" embedded`
        );
    })
}

function convertFloatArrayToArray(float_array, count = 384) {
    const arr = [];
    
    for (let i = 0; i < count; i++) {
        arr.push(float_array[i]); // Fills the array with indices 0 to 383
    }
    return arr
}

async function findSimilarDocuments(embedding, count = 10) {
    const insertStmt = db.prepare(`INSERT INTO vec_scores(id, document, score) 
                                   VALUES (?, ?, ?)`);
    db.prepare('DELETE FROM vec_scores').run();
    // Fetch all embeddings and calculate cosine similarity one by one 
    const result = await runSelectSQL('SELECT id, document, embedding FROM vec_items')
    if (result.success)
        result.rows.forEach(row => {
                                        //console.log('row.document = ', convertFloatArrayToArray(row.EMBEDDING))
                                        //console.log(embedding.calculateCosineSimilarity(convertFloatArrayToArray(row.EMBEDDING)))
                                        const score = embedding.calculateCosineSimilarity(convertFloatArrayToArray(row.EMBEDDING))
                                        // console.log('row.id = ', row.ID)
                                        // console.log('row.document = ', row.DOCUMENT)
                                        // console.log('score = ', score)
                                        insertStmt.run(BigInt(row.ID), 
                                                       row.DOCUMENT, 
                                                       score); 
                                   })

    // Perform a KNN query like so:
    const selectStmt = `SELECT id, document, score
                        FROM vec_scores 
                        ORDER BY score DESC 
                        LIMIT ${count} OFFSET 0`;
    
    return db.prepare(selectStmt).all();
}

await embedDocuments(writers);
await findSimilarDocuments(await context.getEmbeddingFor('sample'));

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

   -- Change current session 
ALTER SESSION SET current_schema = yourname;

-- Define a VARRAY type
CREATE OR REPLACE TYPE float_array AS VARRAY(384) OF BINARY_FLOAT;

-- Create the table using the VARRAY type
DROP TABLE vec_items; 

CREATE TABLE vec_items (
    id NUMBER GENERATED BY DEFAULT AS IDENTITY (START WITH 1) PRIMARY KEY,
    document VARCHAR2(1024),
    embedding albertoi.float_array
);

CREATE TABLE vec_scores (
            id NUMBER GENERATED BY DEFAULT AS IDENTITY (START WITH 1) PRIMARY KEY,
            score FLOAT
         ); 
CREATE INDEX idx_vec_scores ON vec_scores (score);

-- Insert data into the table
INSERT INTO albertoi.vec_items (document, embedding) VALUES ('test 2', albertoi.float_array(1.1, 1.2, 1.3, 39.4)); 

SELECT * FROM albertoi.vec_items;

SELECT banner FROM v$version;


*/
