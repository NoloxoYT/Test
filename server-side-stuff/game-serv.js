import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import express from 'express';
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
const app = express();
const server = createServer(app)
class Player {
    constructor(x,z,y,yaw,pitch,name) {
        this.x = x
        this.z = z
        this.y = y
        this.yaw = yaw
        this.pitch = pitch
        this.name = name
    }
}
const online_usr = new Map()
const SECRET = process.env.JWT_SECRET;

const connections = new Map()
async function start() {
const wss = new WebSocketServer({ server });

    wss.on('connection', (ws) => {
        ws.on('message', (data) => {
            const msg = JSON.parse(data)
            
            if (msg.type === 'auth') {
                try {
                    const decoded = jwt.verify(msg.token, SECRET)
                    const username = decoded.usr
                    ws.username = username
                    connections.set(username, ws)
                    online_usr.set(username, new Player(0, 0, 0, 0, 0, username))
                    ws.send(JSON.stringify({ type: 'auth', status: 'OK' }))
                } catch {
                    ws.close()
                }
            }
            if (msg.type === 'mouv') {
                try {
                    const mouv = msg.mouv
                    const player = online_usr.get(ws.username)
                    const initial_x = player.x
                    const initial_y = player.y
                    const initial_z = player.z
                    const new_x = mouv.x
                    const new_y = mouv.y
                    const new_z = mouv.z
                    const new_pitch = mouv.pitch
                    const new_yaw = mouv.yaw
                    if ( new_x > initial_x+10 || new_x < initial_x-10){
                            ws.close()
                            return
                        }
                        else if (new_z > initial_z+10 || new_z < initial_z-10){
                            ws.close()
                            return
                            }
                            else if (new_y > initial_y+10 || new_y < initial_y-10){
                                ws.close()
                                return
                                }
                                else {
                                    online_usr.set(ws.username, new Player(new_x, new_y, new_z, new_yaw, new_pitch, ws.username))
                                }
                } catch {
                    ws.close()
                }
            }
        })

        ws.on('close', () => {
            connections.delete(ws.username)
            online_usr.delete(ws.username)
        })
    })

    const PORT = process.env.PORT_GAME;
    app.listen(PORT, () => {
        console.log(`Server started on port ${PORT}`);
    });
}

start().catch(err => console.error(err));