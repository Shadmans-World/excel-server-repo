const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const port = process.env.PORT || 3000;
const cors = require('cors');
require('dotenv').config();

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.db_user}:${process.env.db_pass}@cluster0.bho7r.mongodb.net/?appName=Cluster0`;

// MongoDB client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let usersCollection;

// Connect to MongoDB
async function run() {
  try {
    await client.connect();
    const db = client.db('Excel-Courier');
    usersCollection = db.collection('users');

    console.log("MongoDB connected!");

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment successfully!");
  } catch (err) {
    console.error(err);
  }
}
run().catch(console.dir);

// --------------------- JWT Middleware ---------------------
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: "Unauthorized: No token provided" });

  const token = authHeader.split(" ")[1]; // Bearer <token>
  jwt.verify(token, process.env.jwt_secret, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Forbidden: Invalid token" });
    req.user = decoded; // { email, role, iat, exp }
    next();
  });
}

// Role-based middleware
function verifyRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }
    next();
  };
}

// --------------------- Routes ---------------------

// Test server
app.get('/', (req, res) => res.send('Server is running'));

// --------------------- Register ---------------------
app.post('/register', async (req, res) => {
  try {
    const { username, email, password,number, role } = req.body;

    // Check if user exists
    const existing = await usersCollection.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = { username, email, password: hashedPassword, role };
    const result = await usersCollection.insertOne(newUser);

    // Generate JWT
    const token = jwt.sign(
      { email, role },
      process.env.jwt_secret,
      { expiresIn: '1d' }
    );

    res.status(201).json({ message: "User registered", token, userId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------- Login ---------------------
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign(
      { email: user.email, role: user.role },
      process.env.jwt_secret,
      { expiresIn: '1d' }
    );

    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------- Get all users (Admin only) ---------------------
app.get('/users', verifyJWT, verifyRole('admin'), async (req, res) => {
  try {
    const users = await usersCollection.find().toArray();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



// --------------------- Start server ---------------------
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
