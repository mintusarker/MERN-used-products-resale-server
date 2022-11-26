const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const port = process.env.PORT || 5000;

const app = express();

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.dl1tykd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// token function

//jwt token function
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access')
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
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


        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            // console.log('token', req.headers.authorization)
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email }
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        });

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            console.log(booking);
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

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

        // save user 
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user)
            const result = usersCollection.insertOne(user);
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