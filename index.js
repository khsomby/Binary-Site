const express = require('express');
const admin = require('firebase-admin');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://somby-1700653034400-default-rtdb.firebaseio.com"
});

const db = admin.firestore();
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'genodoc_super_secret_key_change_this',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 3600000
  }
}));

const PROTECTED_PASSWORD = "***@Genocide_#†#_Mada@***";

app.post('/auth', (req, res) => {
  const { password } = req.body;
  if (password === PROTECTED_PASSWORD) {
    req.session.authenticated = true;
    res.redirect('/home');
  } else {
    res.send(`
      <html>
        <head><title>GenoDoc - Access Denied</title>
        <style>
          body { font-family: Arial; text-align: center; margin-top: 100px; background: #f5f5f5; }
          .error-box { background: white; padding: 40px; border-radius: 10px; display: inline-block; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h2 { color: #e74c3c; }
          a { color: #667eea; text-decoration: none; margin-top: 20px; display: inline-block; }
        </style>
        </head>
        <body>
          <div class="error-box">
            <h2>❌ Incorrect Password</h2>
            <a href="/">Go Back</a>
          </div>
        </body>
      </html>
    `);
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

function requireAuth(req, res, next) {
  if (req.path === '/' || 
      req.path === '/auth' || 
      req.path === '/add_new_76629' ||
      req.path === '/api/feeds') {
    return next();
  }

  if (req.session && req.session.authenticated === true) {
    return next();
  }

  res.redirect('/');
}

app.use(requireAuth);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.redirect('/home');
  }
  
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
                margin-bottom: 10px;
                font-size: 2em;
            }
            .subtitle {
                color: #666;
                margin-bottom: 30px;
                font-size: 0.9em;
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
            .info {
                margin-top: 20px;
                font-size: 0.8em;
                color: #888;
            }
        </style>
    </head>
    <body>
        <div class="login-container">
            <h1>🔒 GenoDoc</h1>
            <div class="subtitle">Secure Image Gallery Access</div>
            <form action="/auth" method="POST">
                <input type="password" name="password" placeholder="Enter access password" required autofocus>
                <button type="submit">Access Gallery</button>
            </form>
            <div class="info">Protected content • Authorized access only</div>
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
  if (!req.session || !req.session.authenticated) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
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
  console.log(`✅ GenoDoc server running on port ${PORT}`);
  console.log(`🔐 Web access: http://localhost:${PORT} (password required)`);
  console.log(`📱 Android endpoint: POST http://localhost:${PORT}/add_new_76629`);
});