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
    /*
       The Map object in JavaScript is a collection of key-value pairs where both keys and values can be of any type. It maintains the order of insertion and allows for efficient retrieval, addition, and deletion of elements.
    */
    const embeddings = new Map();

    await Promise.all(
        documents.map(async (document) => {
            const embedding = await context.getEmbeddingFor(document);
            embeddings.set(document, embedding);

            // The size property returns the number of key-value pairs in the map.
            console.debug(
                `${embeddings.size}/${documents.length} documents embedded`
            );
        })
    );

    return embeddings;
}

function findSimilarDocuments(embedding, documentEmbeddings) {
    /*
       The Map object in JavaScript is a collection of key-value pairs where both keys and values can be of any type. It maintains the order of insertion and allows for efficient retrieval, addition, and deletion of elements.
    */
    const similarities = new Map();
    
    /*
        Cosine similarity is a measure of similarity between two non-zero vectors in an inner product space. It calculates the cosine of the angle between the vectors, which represents their similarity. The value ranges from -1 to 1:
         1: Indicates identical vectors.
         0: Indicates orthogonal vectors (no similarity).
        -1: Indicates completely opposite vectors.
    */
    for (const [otherDocument, otherDocumentEmbedding] of documentEmbeddings) {
        similarities.set(
            otherDocument,
            embedding.calculateCosineSimilarity(otherDocumentEmbedding)
        );
    }
    // for (const [otherDocument, otherDocumentEmbedding] of documentEmbeddings) {
    //     similarities.set(
    //         otherDocument,
    //         calculateDotProduct(embedding.vector, otherDocumentEmbedding.vector)
    //     );
    // }
    
    console.log()
    console.log('Documents and metrics')
    for (let [key, value] of similarities.entries()) {
        console.log(`${key}: ${value}`);
    }    

    return Array.from(similarities.keys())
        .sort((a, b) => similarities.get(b) - similarities.get(a));
    /*
        Array.from(similarities.keys()): This part converts the keys of the similarities map into an array. The keys() method returns an iterator of the keys in the map, and Array.from() creates an array from this iterator.

        .sort((a, b) => similarities.get(b) - similarities.get(a)): This part sorts the array of keys. The sort() method sorts the elements of the array based on the comparison function provided. The comparison function (a, b) => similarities.get(b) - similarities.get(a) sorts the keys in descending order based on their corresponding values in the similarities map.

        The value returned by the code is an array. Specifically, it returns an array of keys from the similarities map, sorted in descending order based on their corresponding values.
    */
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

console.log()
console.log("query:", query);
console.log("queryEmbedding:", Object.keys(queryEmbedding))
console.log("queryEmbedding.vector:", queryEmbedding.vector);
console.log("queryEmbedding.vector.length:", queryEmbedding.vector.length);

const similarDocuments = findSimilarDocuments(
    queryEmbedding,
    documentEmbeddings
);
const top1SimilarDocument = similarDocuments[0];
const top2SimilarDocument = similarDocuments[1];
const top3SimilarDocument = similarDocuments[2];

console.log()
console.log("First matched document:", top1SimilarDocument);
console.log("Second matched document:", top2SimilarDocument);
console.log("Third matched document:", top3SimilarDocument);

/*
   The node-llama-cpp library does not currently include methods named calculateDotProductSimilarity or calculateEuclideanSimilarity12. However, you can implement these similarity measures yourself using the embeddings generated by the library.
*/
/*
    The dot product, also known as the scalar product, is an algebraic operation that takes two equal-length sequences of numbers (usually vectors) and returns a single number. It is a measure of the extent to which two vectors are parallel.
*/   
function calculateDotProduct(vector1, vector2) {
    if (!Array.isArray(vector1) || !Array.isArray(vector2)) {
        throw new TypeError("Both arguments must be arrays.");
    }
    return vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
}

/*
    Euclidean distance is a measure of the straight-line distance between two points in Euclidean space. It is the most common distance metric used in geometry and various applications such as clustering, classification, and image processing.
*/
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