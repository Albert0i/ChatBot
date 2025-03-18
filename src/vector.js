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


const text = "Hello world";
console.log("Text:", text);

const embedding = await context.getEmbeddingFor(text);
console.log("Embedding vector:", embedding.vector);

/*
   Using Embedding
   Getting Raw Vectors
   https://github.com/withcatai/node-llama-cpp/blob/master/docs/guide/embedding.md
*/