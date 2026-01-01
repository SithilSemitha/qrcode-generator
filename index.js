const express = require('express');
const ejs = require('ejs');
const qrcode = require('qrcode');
const path = require('path');
const app = express();

const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "view"));

app.get('/', (req, res, next) => {
    res.render('index');
});

app.post('/scan', (req, res, next) => {
    const inputText = req.body.text;
    console.log(inputText);
    qrcode.toDataURL(inputText, (err, src) => {
        if (err) res.send("Error occurred");
        res.render('scan', { qr_code: src });
    });
});

app.listen(port,() => {
    console.log(`Server is running on port ${port}`);
});

