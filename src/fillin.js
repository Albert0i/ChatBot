import {fileURLToPath} from "url";
import path from "path";
import {getLlama, LlamaCompletion} from "node-llama-cpp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const llama = await getLlama();
const model = await llama.loadModel({
    modelPath: path.join(__dirname, "models", "codegemma-2b-Q4_K_M.gguf")
});
const context = await model.createContext();
const completion = new LlamaCompletion({
    contextSequence: context.getSequence()
});

if (!completion.infillSupported) {
    console.error("Infill is not supported for this model");
    process.exit(1);
}

const prefix = "4 sweet fruits: Apple,";
const suffix = "and Grape.\n\n";
console.log("Prefix: " + prefix);
console.log("Suffix: " + suffix);

const res = await completion.generateInfillCompletion(prefix, suffix, {
    maxTokens: 100
});
console.log("Fill: " + res);

/*
   Fill in the Middle
   https://github.com/withcatai/node-llama-cpp/blob/master/docs/guide/text-completion.md
*/