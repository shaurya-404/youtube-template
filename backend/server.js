const multer = require('multer');

const storage = multer.diskStorage({
    destination: './videos',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});
const upload = multer({ storage: storage });

const mysql = require('mysql2/promise');
const fs = require('node:fs');
const videopath = './videos';

let pool;
async function databaser(){
    pool = await mysql.createConnection({host: 'localhost',user: 'root',password: '1q2w3e4r'});
    await pool.query('CREATE DATABASE IF NOT EXISTS dtube_db');
    await pool.end()
    pool = await mysql.createPool({host: 'localhost',user: 'root',password: '1q2w3e4r',database: 'dtube_db'});
    await pool.query(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY,email VARCHAR(255) UNIQUE NOT NULL,password VARCHAR(255) NOT NULL,role VARCHAR(50) DEFAULT 'user')`);
    await pool.query(`CREATE TABLE IF NOT EXISTS subscriptions (id INT AUTO_INCREMENT PRIMARY KEY,subscriber_id INT NOT NULL,channel_id INT NOT NULL,UNIQUE KEY unique_subscription (subscriber_id, channel_id))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS videos (id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(255) NOT NULL,filename VARCHAR(255) NOT NULL,views INT DEFAULT 0,likes INT DEFAULT 0,uploaded VARCHAR(255), uploader_id INT DEFAULT 1)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS video_likes (id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,filename VARCHAR(255) NOT NULL,UNIQUE KEY unique_like (user_id, filename))`);
    const [rows, fields] = await pool.query('SELECT filename FROM videos');
    const ef=[]
    for(let i=0;i<rows.length;i++){
        ef.push(rows[i]['filename']);
    }
    const files = fs.readdirSync(videopath);
    console.log(files);
    console.log(rows);
    console.log(ef);
    for(let i=0;i<files.length;i++){
        if ((files[i]).endsWith('.mp4')){
            if (!ef.includes(files[i])){
                await pool.query(`INSERT INTO videos (title, filename, views, likes,uploaded) VALUES (?, ?, 0, 0,'test@dtube.com')`,[files[i].replace('.mp4', ''), files[i]]);
            }
        }
    } 

}
databaser();

const jwt = require('jsonwebtoken');
const JWT_SECRET = "super_secret_key_123";

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/videos', express.static('videos'));

app.post('/api/signup', async (req, res) => {
    const { email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);
        res.status(201).json({ message: "User created successfully!" });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: "Email already exists." });
        } else {
            console.error(error);
            res.status(500).json({ message: "Server error." });
        }
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
            const tokenData = {
                id: user.id,
                email: user.email,
                role: user.role
            };
            const token = jwt.sign(tokenData, JWT_SECRET, { expiresIn: '24h' });
            res.status(200).json({ 
                message: "Login successful!",
                token: token
            });
        } else {
            res.status(401).json({ message: "Invalid email or password." });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
});

// this just for that the system is to be implemented warna no on does this in real life apps.
app.post('/api/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Account not found." });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password = ? WHERE email = ?', 
            [hashedPassword, email]
        );

        res.status(200).json({ message: "Password updated successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
});

app.get('/api/trending', async (req, res) => {
    try {
        // "ORDER BY views DESC" is the secret to making it a Trending page!
        // It sorts by views in DESCENDING order (highest first).
        const [videos] = await pool.query('SELECT * FROM videos ORDER BY views DESC LIMIT 20');
        
        // Send the list of videos back to the frontend
        res.status(200).json(videos);
    } catch (error) {
        console.error("Error fetching trending videos:", error);
        res.status(500).json({ message: "Server error." });
    }
});

/* app.get('/api/videos/details', async (req, res) => {
    // We use req.query because we will pass the filename in the URL
    const { filename } = req.query; 

    try {
        // This is a powerful SQL query! 
        // It grabs the video, and counts how many rows in the subscriptions table match this video's uploded.
        const [rows] = await pool.query(`
            SELECT v.*, 
                   (SELECT COUNT(*) FROM subscriptions WHERE channel_id = v.uploded) AS subscriber_count 
            FROM videos v 
            WHERE v.filename = ?
        `, [filename]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Video not found" });
        }

        // Send the stats back to the frontend
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Error fetching video details:", error);
        res.status(500).json({ message: "Server error." });
    }
}); */

app.get('/api/videos/details', async (req, res) => {
    const { filename } = req.query; 
    try {
        const [rows] = await pool.query(`
            SELECT v.*, 
                   v.uploaded AS uploader_name,
                   (SELECT COUNT(*) FROM subscriptions WHERE channel_id = 1) AS subscriber_count 
            FROM videos v 
            WHERE v.filename = ?
        `, [filename]);

        if (rows.length === 0) return res.status(404).json({ message: "Video not found" });
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
});

app.post('/api/subscribe', async (req, res) => {
    // subscriber_id comes from the logged-in user, channel_id is the video creator
    const { subscriber_id, channel_id } = req.body;

    try {
        const [existing] = await pool.query(
            'SELECT * FROM subscriptions WHERE subscriber_id = ? AND channel_id = ?',
            [subscriber_id, channel_id]
        );

        if (existing.length > 0) {
            await pool.query(
                'DELETE FROM subscriptions WHERE subscriber_id = ? AND channel_id = ?',
                [subscriber_id, channel_id]
            );
            res.status(200).json({ message: "Unsubscribed!", isSubscribed: false });
        } else {
            await pool.query(
                'INSERT INTO subscriptions (subscriber_id, channel_id) VALUES (?, ?)',
                [subscriber_id, channel_id]
            );
            res.status(200).json({ message: "Subscribed!", isSubscribed: true });
        }

    } catch (error) {
        console.error("Subscription error:", error);
        res.status(500).json({ message: "Server error." });
    }
});

app.post('/api/videos/view', async (req, res) => {
    const { filename } = req.body;
    try {
        await pool.query('UPDATE videos SET views = views + 1 WHERE filename = ?', [filename]);
        res.status(200).json({ message: "View counted!" });
    } catch (error) {
        console.error("View count error:", error);
        res.status(500).json({ message: "Server error." });
    }
});

// app.post('/api/videos/like', async (req, res) => {
//     const { filename } = req.body;
//     try {
//         await pool.query('UPDATE videos SET likes = likes + 1 WHERE filename = ?', [filename]);
//         res.status(200).json({ message: "Like added!" });
//     } catch (error) {
//         console.error("Like error:", error);
//         res.status(500).json({ message: "Server error." });
//     }
// });

app.post('/api/videos/like', async (req, res) => {
    const { filename, user_id } = req.body;
    try {
        const [existing] = await pool.query('SELECT * FROM video_likes WHERE user_id = ? AND filename = ?', [user_id, filename]);

        if (existing.length > 0) {
            await pool.query('DELETE FROM video_likes WHERE user_id = ? AND filename = ?', [user_id, filename]);
            await pool.query('UPDATE videos SET likes = likes - 1 WHERE filename = ?', [filename]);
            res.status(200).json({ message: "Unliked!", isLiked: false });
        } else {
            // LIKE: Add to video_likes, and add 1 to the videos table
            await pool.query('INSERT INTO video_likes (user_id, filename) VALUES (?, ?)', [user_id, filename]);
            await pool.query('UPDATE videos SET likes = likes + 1 WHERE filename = ?', [filename]);
            res.status(200).json({ message: "Liked!", isLiked: true });
        }
    } catch (error) {
        console.error("Like error:", error);
        res.status(500).json({ message: "Server error." });
    }
});
app.post('/api/check-like', async (req, res) => {
    const { user_id, filename } = req.body;
    try {
        const [existing] = await pool.query('SELECT * FROM video_likes WHERE user_id = ? AND filename = ?', [user_id, filename]);
        res.status(200).json({ isLiked: existing.length > 0 });
    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
});

app.post('/api/subscribe', async (req, res) => {
    const { subscriber_id, channel_id } = req.body;
    try {
        const [existing] = await pool.query(
            'SELECT * FROM subscriptions WHERE subscriber_id = ? AND channel_id = ?',
            [subscriber_id, channel_id]
        );

        if (existing.length > 0) {
            await pool.query('DELETE FROM subscriptions WHERE subscriber_id = ? AND channel_id = ?', [subscriber_id, channel_id]);
            res.status(200).json({ message: "Unsubscribed!", isSubscribed: false });
        } else {
            await pool.query('INSERT INTO subscriptions (subscriber_id, channel_id) VALUES (?, ?)', [subscriber_id, channel_id]);
            res.status(200).json({ message: "Subscribed!", isSubscribed: true });
        }
    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
});
app.post('/api/check-subscription', async (req, res) => {
    const { subscriber_id, channel_id } = req.body;
    try {
        const [existing] = await pool.query('SELECT * FROM subscriptions WHERE subscriber_id = ? AND channel_id = ?',[subscriber_id, channel_id]);
        res.status(200).json({ isSubscribed: existing.length > 0 });
    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
});

// ==========================================
// 📤 UPLOAD ROUTE
// ==========================================
// We use upload.single('video') to catch the file sent from the frontend
/* app.post('/api/upload', upload.single('video'), async (req, res) => {
    // Check the Auth Guard
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { title } = req.body;
        const filename = req.file.filename;

        // Save the video to the DB, tying it to the user's ID
        await pool.query(
            `INSERT INTO videos (title, filename, views, likes, uploaded, uploded) VALUES (?, ?, 0, 0, ?, ?)`,
            [title, filename, decoded.email, decoded.id]
        );
        res.status(200).json({ message: "Video uploaded successfully!" });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ message: "Server error." });
    }
}); */

/* app.post('/api/upload', upload.single('video'), async (req, res) => {
    // 1. Check the Auth Guard
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        if (req.file) fs.unlinkSync(req.file.path); // Delete file if unauthorized
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { title } = req.body;
        const filename = req.file.filename;

        // 2. SPAM PREVENTION: Check if this user already uploaded a video with this title
        const [existing] = await pool.query(
            'SELECT * FROM videos WHERE title = ? AND uploader_id = ?', 
            [title, decoded.id]
        );

        if (existing.length > 0) {
            // They already uploaded it! Delete the duplicate file from the hard drive instantly.
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: "You already uploaded a video with this title!" });
        }

        // 3. If it's a brand new video, save it to the DB!
        await pool.query(
            `INSERT INTO videos (title, filename, views, likes, uploaded, uploader_id) VALUES (?, ?, 0, 0, ?, ?)`,
            [title, filename, decoded.email, decoded.id]
        );
        res.status(200).json({ message: "Video uploaded successfully!" });
        
    } catch (error) {
        console.error("Upload error:", error);
        // If the server crashes, delete the file so it doesn't take up ghost space
        if (req.file) fs.unlinkSync(req.file.path); 
        res.status(500).json({ message: "Server error." });
    }
}); */
// ==========================================
// 📤 UPLOAD ROUTE (Bulletproof Spam Filter)
// ==========================================
app.post('/api/upload', upload.single('video'), async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        if (req.file) fs.unlinkSync(req.file.path); 
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { title } = req.body;
        const filename = req.file.filename;

        // FIXED SPAM PREVENTION: Checks Title OR the Original File Name!
        const sanitizedFileName = req.file.originalname.replace(/\s+/g, '_');
        const [existing] = await pool.query(
            'SELECT * FROM videos WHERE uploader_id = ? AND (title = ? OR filename LIKE ?)', 
            [decoded.id, title, `%-${sanitizedFileName}`]
        );

        if (existing.length > 0) {
            fs.unlinkSync(req.file.path); // Instantly destroy the duplicate
            return res.status(400).json({ message: "You already uploaded a video with this title or file name!" });
        }

        await pool.query(
            `INSERT INTO videos (title, filename, views, likes, uploaded, uploader_id) VALUES (?, ?, 0, 0, ?, ?)`,
            [title, filename, decoded.email, decoded.id]
        );
        res.status(200).json({ message: "Video uploaded successfully!" });
        
    } catch (error) {
        console.error("Upload error:", error);
        if (req.file) fs.unlinkSync(req.file.path); 
        res.status(500).json({ message: "Server error." });
    }
});

// ==========================================
// 🗑️ DELETE (SOFT DELETE) ROUTE
// ==========================================
app.delete('/api/videos/:id', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const videoId = req.params.id;

        const [rows] = await pool.query('SELECT * FROM videos WHERE id = ?', [videoId]);
        if (rows.length === 0) return res.status(404).json({ message: "Video not found" });
        const video = rows[0];

        if (video.uploader_id !== decoded.id) {
            return res.status(403).json({ message: "You can only delete your own videos!" });
        }

        // FIXED: Bulletproof file move (ignores Windows File Locks)
        const oldPath = `./videos/${video.filename}`;
        const newPath = `./deleted/${video.filename}`;
        
        try {
            if (fs.existsSync(oldPath)) {
                fs.renameSync(oldPath, newPath); 
            }
        } catch (fsErr) {
            console.log("File locked by Windows. Deleting from Database anyway.");
        }

        // Successfully wipe it from the platform
        await pool.query('DELETE FROM videos WHERE id = ?', [videoId]);
        await pool.query('DELETE FROM video_likes WHERE filename = ?', [video.filename]);

        res.status(200).json({ message: "Video securely deleted." });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ message: "Server error." });
    }
});
/* app.delete('/api/videos/:id', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const videoId = req.params.id;

        // 1. Find the video in the database
        const [rows] = await pool.query('SELECT * FROM videos WHERE id = ?', [videoId]);
        if (rows.length === 0) return res.status(404).json({ message: "Video not found" });
        const video = rows[0];

        // 2. Security Check: Does this user actually own this video?
        if (video.uploaded !== decoded.id) {
            return res.status(403).json({ message: "You can only delete your own videos!" });
        }

        // 3. The Soft Delete: Move the file to the 'deleted' folder
        const oldPath = `./videos/${video.filename}`;
        const newPath = `./deleted/${video.filename}`;
        if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath); // Physically moves the file
        }

        // 4. Remove the record from the database
        await pool.query('DELETE FROM videos WHERE id = ?', [videoId]);
        await pool.query('DELETE FROM video_likes WHERE filename = ?', [video.filename]);

        res.status(200).json({ message: "Video securely deleted." });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ message: "Server error." });
    }
}); */

// --- GET LOGGED-IN USER'S VIDEOS ---
app.get('/api/videos/me', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Fetch only videos where uploader_id matches the logged-in user
        const [videos] = await pool.query('SELECT * FROM videos WHERE uploader_id = ? ORDER BY id DESC', [decoded.id]);
        res.status(200).json(videos);
    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
});

// --- GET SUBSCRIPTIONS FEED ---
app.get('/api/videos/subscriptions', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Advanced SQL: Join the videos table with the subscriptions table!
        const [videos] = await pool.query(`
            SELECT v.* FROM videos v
            JOIN subscriptions s ON v.uploader_id = s.channel_id
            WHERE s.subscriber_id = ?
            ORDER BY v.id DESC
        `, [decoded.id]);
        res.status(200).json(videos);
    } catch (error) {
        res.status(500).json({ message: "Server error." });
    }
});

app.listen(8000, () => {
    console.log(`✅ Backend server running on http://localhost:8000`);
});