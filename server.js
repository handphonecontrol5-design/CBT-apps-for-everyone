const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Paths data
const dataDir = path.join(__dirname, 'data');
const usersPath = path.join(dataDir, 'users.json');
const soalPath = path.join(dataDir, 'soal.json');
const resultPath = path.join(dataDir, 'result.json');

// ===== ROUTES =====

// Landing page
app.get('/', (req, res) => res.render('index'));

// Login page
app.get('/login', (req, res) => res.render('login', { error: null }));

// Login POST
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    fs.readFile(usersPath, 'utf8', (err, data) => {
        if(err) return res.send('Gagal membaca users.json');
        let users = [];
        try { users = JSON.parse(data); } catch(e){}

        const user = users.find(u => u.username === username && u.password === password);
        if(!user) return res.render('login', { error: 'Username atau password salah!' });

        if(user.role === 'admin') res.redirect('/admin');
        else if(user.role === 'student') res.redirect(`/cbt?user=${encodeURIComponent(username)}`);
        else res.render('login', { error: 'Role tidak valid!' });
    });
});

// CBT page
app.get('/cbt', (req, res) => {
    const user = req.query.user;
    if(!user) return res.redirect('/login');

    fs.readFile(soalPath, 'utf8', (err, data) => {
        let soal = [];
        if(!err){
            try { soal = JSON.parse(data); } catch(e){}
        }
        res.render('cbt', { soal, user });
    });
});

// CBT submit
app.post('/cbt-submit', (req, res) => {
    const user = req.query.user;
    if(!user) return res.redirect('/login');

    const jawaban = req.body;

    fs.readFile(soalPath, 'utf8', (err, data) => {
        let soal = [];
        if(!err){
            try { soal = JSON.parse(data); } catch(e){}
        }

        let score = 0;
        Object.keys(jawaban).forEach((key, idx) => {
            if(jawaban[key] === soal[idx].answer) score += 5;
        });

        fs.readFile(resultPath, 'utf8', (err, resultData) => {
            let results = [];
            if(!err){
                try { results = JSON.parse(resultData); } catch(e){}
            }

            const existingIndex = results.findIndex(r => r.user === user);
            if(existingIndex >= 0) results[existingIndex].score = score;
            else results.push({ user, score });

            fs.writeFile(resultPath, JSON.stringify(results, null, 2), err => {
                if(err) console.error(err);
                res.render('result', { score, total: soal.length*5, user, allResults: results });
            });
        });
    });
});

// Admin page (lihat soal + skor)
app.get('/admin', (req, res) => {
    fs.readFile(resultPath, 'utf8', (err, resultData) => {
        let results = [];
        if(!err){
            try { results = JSON.parse(resultData); } catch(e){ results = []; }
        }

        fs.readFile(soalPath, 'utf8', (err, soalData) => {
            let soal = [];
            if(!err){
                try { soal = JSON.parse(soalData); } catch(e){ soal = []; }
            }

            // Pastikan soal selalu ada
            res.render('admin', { results, soal });
        });
    });
});

// Admin add soal
app.post('/admin/add-soal', (req, res) => {
    const { q, options, answer } = req.body;

    fs.readFile(soalPath, 'utf8', (err, data) => {
        let soal = [];
        if(!err){
            try { soal = JSON.parse(data); } catch(e){}
        }

        const optionsArray = options.split(',').map(o => o.trim());
        soal.push({ q, options: optionsArray, answer });

        fs.writeFile(soalPath, JSON.stringify(soal, null, 2), err => {
            if(err) console.error(err);
            res.redirect('/admin');
        });
    });
});

// Admin delete soal
app.post('/admin/delete-soal', (req, res) => {
    const { index } = req.body;

    fs.readFile(soalPath, 'utf8', (err, data) => {
        let soal = [];
        if(!err){
            try { soal = JSON.parse(data); } catch(e){}
        }

        soal.splice(index, 1);
        fs.writeFile(soalPath, JSON.stringify(soal, null, 2), err => {
            if(err) console.error(err);
            res.redirect('/admin');
        });
    });
});

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

