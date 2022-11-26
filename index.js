const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 5000;

const app = express();

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.dl1tykd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const laptopCategoryCollection = client.db('usedLaptop').collection('itemCategory');
        const itemCollection = client.db('usedLaptop').collection('itemName');
        const bookingsCollection = client.db('usedLaptop').collection('bookings');

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


        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = {email: email}
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings)
        })

        app.post('/bookings', async(req ,res) =>{
            const booking = req.body;
            console.log(booking);
            const result = await bookingsCollection.insertOne(booking);
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