import express from 'express';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and form data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Home route
app.get('/', (req, res) => {
  res.send('<h1><center>Welcome to my API!</center></h1>');
});

// Route to accept POST requests with JSON data
app.post('/api/v1/load', (req, res) => {
    const jsonData = req.body;
    console.log('jsonData=', jsonData)
    res.json({ message: 'JSON data received', data: jsonData });
});
// curl -X POST http://localhost:3000/api/v1/load -H "Content-Type: application/json" -d "{ \"id\": \"65535\", \"observed\": \"I saw Bigfoot at Walmart buying flip-flops.\" }" -v 

// Route to accept POST requests with form data
app.post('/form-submit', (req, res) => {
    const formData = req.body;
    console.log('formData=', formData)
    res.json({ message: 'Form data received', data: formData });
});
// curl -X POST http://localhost:3000/form-submit -H "Content-Type: application/x-www-form-urlencoded" -d "id=12234&observed=I saw bigfoot in Walmark buying size 17 flip flop."
 
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});