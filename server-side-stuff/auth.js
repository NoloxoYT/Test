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
const servers = new Database('servers.db');

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
    try {
        const password = decode(req.query.psw);
        const username = decode(req.query.usr);
        console.log('sign-in attempt:', username);
        const check = user.prepare("SELECT * FROM users WHERE username = ?").get(username);
        if (check) {
            res.status(401).send('Username is already taken');
        } else {
            const hashed = bcrypt.hashSync(password, saltRounds);
            user.prepare("INSERT INTO users (username,password) VALUES (?,?)").run(username, hashed);
            res.status(201).send('User created');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});
app.get('/servers', async (req, res) => {
    try {
        if (req.query.name != null){
            const server_name = (req.query.name);
            var serv = servers.prepare("SELECT * FROM servers WHERE name = ?").get(server_name)
            var serv_meta = JSON.stringify({ name: serv.name, ip: serv.ip, map: serv.map, max_player: serv.max_p, current_player: serv.current_p })
            res.status(200).send(serv_meta)
        }
        else{
            var max = req.query.max
            var serv_list = servers.prepare("SELECT * FROM servers LIMIT ?").all(max);
            res.status(200).send(JSON.stringify(serv_list))
        }
    }
    catch(e){
        console.log(e)
    }
});
app.get('/servreg', async (req, res) => {
    try{
        var name = req.query.name
        var max_player = req.query.max_player
        var map = req.query.map
        var ip = req.ip
        var port = req.query.port
        var UUID = name+map+str(max_player)+str(ip)+str(port)
        UUID = bcrypt.hashSync(UUID, 3452)
        if (servers.prepare("SELECT * FROM servers WHERE uuid =?").get(UUID)){
            return
        }
        servers.prepare("INSERT INTO servers (name,max_player,map,ip,port, uuid) VALUES (?,?,?,?,?,?) ON CONFLICT(uuid) DO NOTHING;").run(name,max_player,map,ip,port,UUID); 
        res.status(201).send(JSON.stringify(UUID))
    }
    catch(e){
        console.log(e)
    }
});

const PORT = process.env.PORT_AUTH || 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});