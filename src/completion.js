import {fileURLToPath} from "url";
import path from "path";
import {getLlama, LlamaCompletion} from "node-llama-cpp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const llama = await getLlama();
const model = await llama.loadModel({
    modelPath: path.join(__dirname, "models", "Meta-Llama-3.1-8B-Instruct-Q3_K_M.gguf")
});
const context = await model.createContext();
const completion = new LlamaCompletion({
    contextSequence: context.getSequence()
});

const input = "Here is a list of sweet fruits:\n* ";
console.log("Input: " + input);

/*
   It's recommended to set maxTokens when generating a text completion to ensure the completion doesn't go on forever
*/
const res = await completion.generateCompletion(input, {
    maxTokens: 100
});
console.log("Completion: " + res);

/*
   Text Completion
   https://github.com/withcatai/node-llama-cpp/blob/master/docs/guide/text-completion.md
*/