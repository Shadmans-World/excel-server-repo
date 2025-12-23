const express = require('express');
const app = express();
const jwt = require('jsonwebtoken')
const port =process.env.PORT || 3000;
const cors = require('cors');
require('dotenv').config();
app.use(cors());
app.use(express.json());


app.get('/',(req,res)=>{
    res.send('Server is running')
})

app.listen(port,()=>{
    console.log(`Server is running on ${port}`);
})