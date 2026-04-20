import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import { encode, decode, validate } from '@loxjs/node-base64/index.js';
import Database from 'better-sqlite3';
import express from 'express';
const bcrypt = require('bcrypt');
const app = express();
const SECRET = process.env.JWT_SECRET;
const saltRounds = process.env.SALT
async function start() {
    const user = await open({
        filename: 'user.db',
        driver: sqlite3.Database
    });
    app.get('/auth/jwt',async (req, res) => {
        const usr = decode(req.query.usr)
        const psw = decode(req.query.psw)
        const row = await user.get("SELECT * FROM users WHERE username = ?" [usr])
        ok = await bcrypt.compare(psw, row.password);
        if (ok){
            const token = jwt.sign({ usr }, SECRET, { expiresIn: '48h' })
            res.status(201).send(token)
        } else {
            res.status(401).send('credentials are incorrect')
        }});
    app.get('/auth/sign-in', async (req,res) => {
        const password = decode(req.query.psw);
        const username = decode(req.query.usr);
        const check = await user.get("SELECT * FROM users WHERE username = ?", [username]);
        if (check) {
            res.status(401).send('Username is already taken')
        } else {
            password = bcrypt.hashSync(password, saltRounds);
            await user.run("INSERT INTO users (username,password) VALUES (?,?)", [username, password])
        }
    });
    const PORT = process.env.PORT_AUTH;
    app.listen(PORT, () => {
        console.log(`Server started on port ${PORT}`);
    });
}

start().catch(err => console.error(err));