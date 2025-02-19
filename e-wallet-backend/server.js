import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { connectDB, client, ObjectId } from './config/db.js';

dotenv.config();
console.log('JWT Secret:', process.env.JWT_SECRET);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

let db;

connectDB().then((database) => {
  db = database;
});

// Wallet Routes
const walletRoutes = express.Router();

// Get balance
walletRoutes.get('/balance', async (req, res) => {
  try {
    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(req.query.userId) 
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ balance: user.balance });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Deposit money
walletRoutes.post('/deposit', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const userObjectId = new ObjectId(userId);

    // Change the option based on your driver version
    const result = await db.collection('users').findOneAndUpdate(
      { _id: userObjectId },
      { $inc: { balance: Number(amount) } },
      { returnOriginal: false } // use this if your driver doesn't support 'returnDocument'
    );

    if (!result) {
      return res.status(404).json({ message: 'User not found' });
    }

    const transaction = {
      senderId: userObjectId,
      receiverId: userObjectId,
      amount: Number(amount),
      type: 'deposit',
      status: 'completed',
      description: 'Wallet deposit',
      timestamp: new Date()
    };

    await db.collection('transactions').insertOne(transaction);

    res.json({ 
      balance: result.balance, 
      transaction 
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Withdraw money
walletRoutes.post('/withdraw', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const userObjectId = new ObjectId(userId);

    const user = await db.collection('users').findOne({ _id: userObjectId });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient funds' });
    }

    const result = await db.collection('users').findOneAndUpdate(
      { _id: userObjectId },
      { $inc: { balance: -Number(amount) } },
      { returnDocument: 'after' }
    );

    const transaction = {
      senderId: userObjectId,
      receiverId: userObjectId,
      amount: Number(amount),
      type: 'withdrawal',
      status: 'completed',
      description: 'Wallet withdrawal',
      timestamp: new Date()
    };

    await db.collection('transactions').insertOne(transaction);

    res.json({ 
      balance: result.balance, 
      transaction 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Transfer money
walletRoutes.post('/transfer', async (req, res) => {
  try {
    const { senderId, receiverId, amount } = req.body;
    const senderObjectId = new ObjectId(senderId);

    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        const sender = await db.collection('users').findOne(
          { _id: senderObjectId },
          { session }
        );

        const reciever = await db.collection('users').findOne(
          { username: receiverId },
          { session }
        );

        if (!sender) {
          throw new Error('Sender not found');
        }

        if (sender.balance < amount) {
          throw new Error('Insufficient funds');
        }

        await db.collection('users').updateOne(
          { _id: senderObjectId },
          { $inc: { balance: -Number(amount) } },
          { session }
        );

        await db.collection('users').updateOne(
          { _id: reciever._id },
          { $inc: { balance: Number(amount) } },
          { session }
        );

        const transaction = {
          senderId: senderObjectId,
          receiverId: reciever._id,
          amount: Number(amount),
          type: 'transfer',
          status: 'completed',
          description: 'Money transfer',
          timestamp: new Date()
        };

        await db.collection('transactions').insertOne(transaction, { session });
      });

      const updatedSender = await db.collection('users').findOne({ _id: senderObjectId });
      res.json({ 
        senderBalance: updatedSender.balance,
        message: 'Transfer successful' 
      });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Get transactions
walletRoutes.get('/transactions', async (req, res) => {
  try {
    const { userId } = req.query;
    const userObjectId = new ObjectId(userId);

    const transactions = await db.collection('transactions')
      .find({
        $or: [
          { senderId: userObjectId },
          { receiverId: userObjectId }
        ]
      })
      .sort({ timestamp: -1 })
      .toArray();

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific transaction by ID
walletRoutes.get('/transactions/:id', async (req, res) => {
  try {
    const transactionId = req.params.id;
    const transaction = await db.collection('transactions').findOne({ _id: new ObjectId(transactionId) });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});


// ========================
// Authentication Routes
// ========================
const authRoutes = express.Router();

// Register a new user
authRoutes.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Input validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user document
    const newUser = {
      username,
      email,
      password: hashedPassword,
      balance: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('users').insertOne(newUser);

    // Generate a JWT token
    const token = jwt.sign({ userId: result.insertedId, email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ message: 'User registered successfully', token, userId: result.insertedId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User login
authRoutes.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find the user by email
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate a JWT token
    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ message: 'Logged in successfully', token, userId: user._id, username: user.username });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// User logout (for JWT, simply instruct client to discard the token)
authRoutes.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);


// ========================
// Global Error Handling Middleware
// ========================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});