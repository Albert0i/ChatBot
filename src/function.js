import {fileURLToPath} from "url";
import path from "path";
import {getLlama, LlamaChatSession, defineChatSessionFunction} from "node-llama-cpp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const llama = await getLlama();
const model = await llama.loadModel({
    modelPath: path.join(__dirname, "models", "Meta-Llama-3.1-8B-Instruct-Q3_K_M.gguf")
});
const context = await model.createContext();
const session = new LlamaChatSession({
    contextSequence: context.getSequence()
});

const fruitPrices = {
    "apple": "$6",
    "banana": "$4"
};
const functions = {
    getFruitPrice: defineChatSessionFunction({
        description: "Get the price of a fruit",
        params: {
            type: "object",
            properties: {
                name: {
                    type: "string"
                }
            }
        },
        async handler(params) {
            const name = params.name.toLowerCase();
            if (Object.keys(fruitPrices).includes(name))
                return {
                    name: name,
                    price: fruitPrices[name]
                };

            return `Unrecognized fruit "${params.name}"`;
        }
    })
};


const q1 = "Is an apple more expensive than a banana?";
console.log("User: " + q1);

const a1 = await session.prompt(q1, {functions});
console.log("AI: " + a1);

/*
   Using Function Calling
   https://github.com/withcatai/node-llama-cpp/blob/master/docs/guide/function-calling.md
*/