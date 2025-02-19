// setupDatabase.js
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.error('MONGODB_URI is not defined in environment variables');
    process.exit(1);
}

async function setupDatabase() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('ewallet');

        // Create collections with validators
        await db.createCollection('users', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['username', 'email', 'password', 'balance'],
                    properties: {
                        username: {
                            bsonType: 'string',
                            description: 'must be a string and is required'
                        },
                        email: {
                            bsonType: 'string',
                            description: 'must be a string and is required'
                        },
                        password: {
                            bsonType: 'string',
                            description: 'must be a string and is required'
                        },
                        balance: {
                            bsonType: 'number',
                            description: 'must be a number and is required'
                        }
                    }
                }
            }
        });

        await db.createCollection('transactions', {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    required: ['senderId', 'amount', 'type', 'status'],
                    properties: {
                        senderId: {
                            bsonType: 'objectId',
                            description: 'must be an objectId and is required'
                        },
                        receiverId: {
                            bsonType: 'objectId',
                            description: 'must be an objectId'
                        },
                        amount: {
                            bsonType: 'number',
                            description: 'must be a number and is required'
                        },
                        type: {
                            enum: ['deposit', 'withdrawal', 'transfer'],
                            description: 'must be one of the allowed values'
                        },
                        status: {
                            enum: ['pending', 'completed', 'failed'],
                            description: 'must be one of the allowed values'
                        }
                    }
                }
            }
        });

        // Create indexes
        await db.collection('users').createIndex({ "username": 1 }, { unique: true });
        await db.collection('users').createIndex({ "email": 1 }, { unique: true });

        // Insert sample users
        const usersResult = await db.collection('users').insertMany([
            {
                username: "john_doe",
                email: "john@example.com",
                password: "hashedpassword123",
                balance: 1000,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                username: "jane_smith",
                email: "jane@example.com",
                password: "hashedpassword456",
                balance: 500,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ]);

        console.log('Sample users inserted');

        // Get the inserted user IDs
        const user1Id = usersResult.insertedIds[0];
        const user2Id = usersResult.insertedIds[1];

        // Insert sample transactions
        await db.collection('transactions').insertMany([
            {
                senderId: user1Id,
                receiverId: user1Id,
                amount: 200,
                type: "deposit",
                status: "completed",
                description: "Initial deposit",
                timestamp: new Date()
            },
            {
                senderId: user1Id,
                receiverId: user2Id,
                amount: 50,
                type: "transfer",
                status: "completed",
                description: "Money transfer",
                timestamp: new Date()
            },
            {
                senderId: user2Id,
                receiverId: user2Id,
                amount: 30,
                type: "withdrawal",
                status: "completed",
                description: "ATM withdrawal",
                timestamp: new Date()
            }
        ]);

        console.log('Sample transactions inserted');

        // Verify the data
        const users = await db.collection('users').find().toArray();
        console.log('\nUsers:', users);

        const transactions = await db.collection('transactions').find().toArray();
        console.log('\nTransactions:', transactions);

        console.log('Database setup completed successfully');

    } catch (error) {
        console.error('Error setting up database:', error);
    } finally {
        await client.close();
    }
}

// Run the setup

function setupDB(){
    setupDatabase().catch(console.error);
}

export default setupDB;