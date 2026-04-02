const express = require('express');
const admin = require('firebase-admin');
const path = require('path');
const bodyParser = require('body-parser');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-firebase-project.firebaseio.com"
});

const db = admin.firestore();
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PROTECTED_PASSWORD = "***@Genocide_#†#_Mada@***";
let isAuthenticated = false;


app.post('/auth', (req, res) => {
  const { password } = req.body;
  if (password === PROTECTED_PASSWORD) {
    isAuthenticated = true;
    res.redirect('/home');
  } else {
    isAuthenticated = false;
    res.send(`
      <html>
        <head><title>GenoDoc - Access Denied</title></head>
        <body style="font-family: Arial; text-align: center; margin-top: 100px;">
          <h2>Incorrect Password</h2>
          <a href="/">Go Back</a>
        </body>
      </html>
    `);
  }
});

function requireAuth(req, res, next) {
  if (isAuthenticated || req.path === '/' || req.path === '/auth' || req.path === '/add_new_76629') {
    // /add_new_76629 is intentionally unprotected for Android
    return next();
  }
  res.redirect('/');
}

app.use(requireAuth);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GenoDoc - Secure Access</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .login-container {
                background: white;
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                width: 90%;
                max-width: 400px;
                text-align: center;
            }
            h1 {
                color: #333;
                margin-bottom: 30px;
                font-size: 2em;
            }
            input {
                width: 100%;
                padding: 12px;
                margin: 10px 0;
                border: 2px solid #ddd;
                border-radius: 8px;
                font-size: 16px;
                transition: 0.3s;
            }
            input:focus {
                outline: none;
                border-color: #667eea;
            }
            button {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 30px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                transition: transform 0.2s;
                width: 100%;
                margin-top: 20px;
            }
            button:hover {
                transform: translateY(-2px);
            }
            .error {
                color: #e74c3c;
                margin-top: 10px;
            }
        </style>
    </head>
    <body>
        <div class="login-container">
            <h1>🔒 GenoDoc</h1>
            <form action="/auth" method="POST">
                <input type="password" name="password" placeholder="Enter access password" required autofocus>
                <button type="submit">Access Gallery</button>
            </form>
        </div>
    </body>
    </html>
  `);
});

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/add_new_76629', async (req, res) => {
  try {
    const { uploader, image, description } = req.body;

    if (!uploader || !image || !description) {
      return res.status(400).json({ error: 'Missing required fields: uploader, image, description' });
    }

    const newFeed = {
      uploader: uploader,
      image: image,
      description: description,
      time: new Date().toISOString(),
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('feeds').add(newFeed);
    
    res.status(201).json({ 
      success: true, 
      message: 'Feed added successfully',
      id: docRef.id,
      data: newFeed
    });
  } catch (error) {
    console.error('Error adding feed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/feeds', async (req, res) => {
  try {
    const snapshot = await db.collection('feeds')
      .orderBy('timestamp', 'desc')
      .get();
    
    const feeds = [];
    snapshot.forEach(doc => {
      feeds.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(feeds);
  } catch (error) {
    console.error('Error fetching feeds:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GenoDoc server running on port ${PORT}`);
  console.log(`Access at http://localhost:${PORT}`);
  console.log(`Admin add endpoint: POST http://localhost:${PORT}/add_new_76629`);
});