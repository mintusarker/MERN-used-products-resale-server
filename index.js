const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


const port = process.env.PORT || 5000;

const app = express();

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.dl1tykd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


//jwt token function
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    // console.log(authHeader)
    if (!authHeader) {
        return res.status(401).send('unauthorized access')
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            // console.log(err)
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        const laptopCategoryCollection = client.db('usedLaptop').collection('itemCategory');
        const itemCollection = client.db('usedLaptop').collection('itemName');
        const bookingsCollection = client.db('usedLaptop').collection('bookings');
        const usersCollection = client.db('usedLaptop').collection('users');
        const productsCollection = client.db('usedLaptop').collection('products');
        const paymentsCollection = client.db('usedLaptop').collection('payments');
        const advertiseCollection = client.db('usedLaptop').collection('advertise');


        app.get('/itemCategory', async (req, res) => {
            const query = {};
            const result = await laptopCategoryCollection.find(query).toArray();
            res.send(result)
        });

        app.get('/itemName', async (req, res) => {
            const id = req.params.category_id;
            // const query = {_id: id}
            const data = await itemCollection.find(id).toArray()
            res.send(data)
        });

        app.get('/itemName/:id', async (req, res) => {
            const id = req.params.id;
            const query = { category_id: id };
            const item = await itemCollection.find(query).toArray();
            res.send(item)

        });

        app.get('/itemCategory', async (req, res) => {
            const query = {};
            const result = await itemCollection.find(query).project({ name: 1 }).toArray();
            res.send(result)
        })


        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            // const decodedEmail = req.decoded.email;

            // if (email !== decodedEmail) {
            //     return res.status(403).send({ message: 'forbidden access' })
            // }
            const query = { email: email }
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        });


        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const booking = await bookingsCollection.findOne(query);
            res.send(booking);
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            console.log(booking);
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        //payment 
        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            console.log(booking)
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ],
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })


        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        //JWT TOKEN
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '2h' });
                return res.send({ accessToken: token });
            }
            console.log(user)
            res.status(403).send({ accessToken: '' });
        })


        //all users
        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users)
        });


        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' })
        })

        //users Account variant
        app.get('/user/buyers', async (req, res) => {
            const option = {}
            // const query = { option }
            const options = await usersCollection.find({option: "Buyers Account"}).toArray();
            res.send(options);
        })

        app.delete('/user/buyers/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = await usersCollection.deleteOne(filter);
            res.send(options);
        });

        app.get('/user/sellers', async (req, res) => {
            const option = {}
            // const query = { option }
            const options = await usersCollection.find({option: "Seller Account"}).toArray();
            res.send(options);
        });

        app.delete('/user/sellers/:id', verifyJWT, async(req, res)=>{
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const options = await usersCollection.deleteOne(filter);
            res.send(options)
        })

        // save user 
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user)
            const result = usersCollection.insertOne(user);
            res.send(result);
        });

        //delete
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })

        //make admin
        app.put('/users/admin/:id', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        // my product
        app.get('/products', async (req, res) => {
            const query = {};
            const products = await productsCollection.find(query).toArray();
            res.send(products)
        });

        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result)
        });


        //product delete API
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(filter);
            res.send(result);
        });

        // advertise
        app.post('/advertise', async (req, res) => {
            const advertise = req.body;
            console.log(advertise)
            const result = await advertiseCollection.insertOne(advertise)
            res.send(result)
        });

        app.get('/advertise', async (req, res) => {
            const query = {}
            const result = await advertiseCollection.find(query).toArray();
            res.send(result)
        })

        app.delete('/advertise/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await advertiseCollection.deleteOne(filter);
            res.send(result);
        });

    }
    finally {

    }
}
run().catch(console.log)


app.get('/', async (req, res) => {
    res.send('Used products resell server is running');
})

app.listen(port, () => console.log(`Used products resell server running on ${port}`))

