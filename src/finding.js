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

async function embedDocuments(documents) {
    const embeddings = new Map();

    await Promise.all(
        documents.map(async (document) => {
            const embedding = await context.getEmbeddingFor(document);
            embeddings.set(document, embedding);

            console.debug(
                `${embeddings.size}/${documents.length} documents embedded`
            );
        })
    );

    return embeddings;
}

function findSimilarDocuments(embedding, documentEmbeddings) {
    const similarities = new Map();
    // Cosine
    // for (const [otherDocument, otherDocumentEmbedding] of documentEmbeddings) {
    //     similarities.set(
    //         otherDocument,
    //         embedding.calculateCosineSimilarity(otherDocumentEmbedding)
    //     );
    // }
    // Dot Product / Euclidean
    for (const [otherDocument, otherDocumentEmbedding] of documentEmbeddings) {
        similarities.set(
            otherDocument,
            calculateDotProduct(embedding.vector, otherDocumentEmbedding.vector)
        );
    }

    return Array.from(similarities.keys())
        .sort((a, b) => similarities.get(b) - similarities.get(a));
}

const documentEmbeddings = await embedDocuments([
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


const query = "What is the tallest mountain on Earth?";
const queryEmbedding = await context.getEmbeddingFor(query);

const similarDocuments = findSimilarDocuments(
    queryEmbedding,
    documentEmbeddings
);
const topSimilarDocument = similarDocuments[0];

console.log("query:", query);
console.log("queryEmbedding:", Object.keys(queryEmbedding))
console.log("queryEmbedding.vector:", queryEmbedding.vector);
console.log("queryEmbedding.vector.length:", queryEmbedding.vector.length);

console.log("Document:", topSimilarDocument);

/*
   The node-llama-cpp library does not currently include methods named calculateDotProductSimilarity or calculateEuclideanSimilarity12. However, you can implement these similarity measures yourself using the embeddings generated by the library.
*/
function calculateDotProduct(vector1, vector2) {
    if (!Array.isArray(vector1) || !Array.isArray(vector2)) {
        throw new TypeError("Both arguments must be arrays.");
    }
    return vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
}

function calculateEuclideanDistance(vector1, vector2) {
    if (!Array.isArray(vector1) || !Array.isArray(vector2)) {
        throw new TypeError("Both arguments must be arrays.");
    }
    return Math.sqrt(vector1.reduce((sum, val, i) => sum + Math.pow(val - vector2[i], 2), 0));
}

/*
   Using Embedding
   Finding Relevant Documents
   https://github.com/withcatai/node-llama-cpp/blob/master/docs/guide/embedding.md
*/