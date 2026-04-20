import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import { decode } from '@loxjs/node-base64/index.js';
import Database from 'better-sqlite3';
import express from 'express';
import bcrypt from 'bcryptjs';

const app = express();
const SECRET = process.env.JWT_SECRET;
const saltRounds = parseInt(process.env.SALT);
const user = new Database('user.db');

app.get('/auth/jwt', async (req, res) => {
    const usr = decode(req.query.usr);
    const psw = decode(req.query.psw);
    const row = user.prepare("SELECT * FROM users WHERE username = ?").get(usr);
    if (!row) return res.status(401).send('credentials are incorrect');
    const ok = await bcrypt.compare(psw, row.password);
    if (ok) {
        const token = jwt.sign({ usr }, SECRET, { expiresIn: '48h' });
        res.status(201).send(token);
    } else {
        res.status(401).send('credentials are incorrect');
    }
});

app.get('/auth/sign-in', async (req, res) => {
    const password = decode(req.query.psw);
    const username = decode(req.query.usr);
    const check = user.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (check) {
        res.status(401).send('Username is already taken');
    } else {
        const hashed = bcrypt.hashSync(password, saltRounds);
        user.prepare("INSERT INTO users (username,password) VALUES (?,?)").run(username, hashed);
        res.status(201).send('User created');
    }
});

const PORT = process.env.PORT_AUTH || 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});