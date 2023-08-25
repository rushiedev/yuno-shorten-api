// Require Express
const express = require('express');

// BodyParser Middleware
const bodyParser = require('body-parser');

// CORS
const cors = require('cors');

// MongoDB
const { MongoClient, ServerApiVersion } = require('mongodb');

// isUrl
const isUrl = require('is-url');
const { generate } = require('./generate');

// Rate Limit
const rateLimit = require('express-rate-limit').default;

// Load Environment Variables Config
require('dotenv').config();

// Set default Timezone
process.env.TZ = 'Asia/Ho_Chi_Minh';

// Use Express
const app = express();

// Header
const header = { "Content-type": "application/json" };

// =))
const limit = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    handler: function (req, res) {
        res.status(429)
            .header(header)
            .send(JSON.stringify({
                "status": 0,
                "msg": "Too many requests, please try again later!"
            }))
    }
})

// Use BodyParser
app.use(bodyParser.json());

// Use CORS
app.use(cors());

// Use MongoDB
const client = new MongoClient(process.env.MONGODB_URL, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
    }
})

// Home Page
app.all('/', (req, res) => {
    res.send('Shorten Link!');
})

// Redirect shorten link
app.get('/:uri', async (req, res) => {
    const uri = req.params.uri;

    if (uri && uri != ' ') {
        try {
            await client.connect();

            const db = client.db(process.env.MONGODB_DB);

            const col = await db.collection(process.env.MONGODB_COLLECTION);

            var find = await col.findOne({ uri })

            if (find) {
                res.redirect(find.url);
            } else {
                res.status(404)
                    .send("No URL found!");
            }

        } catch (e) {
            console.error(e);

            res.status(500)
                .send("Error!");
        } finally {
            await client.close();
        }
    } else {
        res.status(403)
            .send("No URI found!");
    }
})

// Create shorten link
app.post('/create', limit, async (req, res) => {
    // Get body params
    const { url } = req.body;

    if (url && url != ' ' && isUrl(url)) {
        try {
            await client.connect();

            const db = client.db(process.env.MONGODB_DB);

            const col = await db.collection(process.env.MONGODB_COLLECTION);

            const generatedUri = generate(6);

            await col.insertOne({ uri: generatedUri, url })

            res.status(200)
                .header(header)
                .send(JSON.stringify({
                    status: 1,
                    msg: "Generate done!",
                    data: generatedUri
                }))
        } catch (e) {
            console.error(e);

            res.status(500)
                .header(header)
                .send(JSON.stringify({
                    status: 0,
                    msg: "Error!"
                }))
        } finally {
            client.close();
        }
    } else {
        // No URL
        res.status(403)
            .header(header)
            .send(JSON.stringify({
                "status": 0,
                "msg": "Put a valid URL please!"
            }))
    }
})

// Listen to port 8000
app.listen(process.env.PORT)

console.log(`Yuno Shorten API run at ${process.env.PORT} port!`)