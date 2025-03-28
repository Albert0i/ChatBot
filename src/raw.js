import {fileURLToPath} from "url";
import path from "path";
import {getLlama} from "node-llama-cpp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const llama = await getLlama();
const model = await llama.loadModel({
    modelPath: path.join(__dirname, "models", "Meta-Llama-3.1-8B-Instruct-Q3_K_M.gguf")
});
const context = await model.createContext();
const sequence = context.getSequence();

const q1 = "Hi there, how are you?";
console.log("User: " + q1);

const tokens = model.tokenize("USER: " + q1 + "\nASSISTANT: ");
const res = [];
for await (const generatedToken of sequence.evaluate(tokens)) {
    res.push(generatedToken);

    // It's important to not concatenate the results as strings,
    // as doing so breaks some characters (like some emojis)
    // that consist of multiple tokens.
    // By using an array of tokens, we can decode them correctly together.
    const resString = model.detokenize(res);

    const lastPart = resString.split("ASSISTANT:").pop();
    if (lastPart?.includes("USER:"))
        break;
}

const a1 = model.detokenize(res).split("USER:")[0];
console.log("AI: " + a1.trim());

/*
   Low Level API
   https://github.com/withcatai/node-llama-cpp/blob/master/docs/guide/low-level-api.md
*/