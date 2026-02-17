const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// API routes for metadata storage and IPFS interaction
// ... implementation ...

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});