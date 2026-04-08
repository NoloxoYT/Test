import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import express from 'express';
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import RAPIER from '@dimforge/rapier3d-compat'
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
const colliderMap = new Map();
const rigidBodies = new Map();
const app = express();
const server = createServer(app)
await RAPIER.init()
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 }) // gravité
const groundDesc = RAPIER.RigidBodyDesc.fixed()
const ground = world.createRigidBody(groundDesc)
const groundCollider = RAPIER.ColliderDesc.cuboid(100, 0.1, 100)
world.createCollider(groundCollider, ground)
class Player {
    constructor(x,z,y,yaw,pitch,health,hunger,thirst,hand,name) {
        this.x = x
        this.z = z
        this.y = y
        this.yaw = yaw
        this.pitch = pitch
        this.health = health
        this.hunger = hunger
        this.thirst = thirst
        this.hand = hand
        this.name = name
    }
}
const online_usr = new Map()
const SECRET = process.env.JWT_SECRET;

const connections = new Map()
async function start() {
    const range_fron_weapon = await open({
        filename: 'range.db',
        driver: sqlite3.Database
    });
const wss = new WebSocketServer({ server });
function DirectionsFromAngle(yaw,pitch){
    const yawRad = yaw * Math.PI / 180;
    const pitchRad = pitch * Math.PI / 180;
    return{
        x: Math.cos(pitchRad) * Math.sin(yawRad),
        y: Math.cos(pitchRad),
        z: Math.cos(pitchRad) * Math.cos(yawRad)
    }
}
function ballisticRaycast(origin, direction, speed, gravity, maxTime, steps, world) {
    const dt = maxTime / steps
    let pos = { ...origin }
    let vel = {
        x: direction.x * speed,
        y: direction.y * speed,
        z: direction.z * speed
    }

    for (let i = 0; i < steps; i++) {
        // position suivante
        const nextPos = {
            x: pos.x + vel.x * dt,
            y: pos.y + vel.y * dt,
            z: pos.z + vel.z * dt
        }

        // raycast entre pos et nextPos
        const dir = { x: nextPos.x - pos.x, y: nextPos.y - pos.y, z: nextPos.z - pos.z }
        const ray = new RAPIER.Ray(pos, dir)
        const hit = world.castRay(ray, dt * speed, true)

        if (hit) {
            return {
                hit: true,
                point: ray.pointAt(hit.timeOfImpact),
                distance: i * dt * speed,
                collider: hit.collider,
            }
        }

        // appliquer gravité
        vel.y -= gravity * dt
        pos = nextPos
    }

    return { hit: false }
}
online_usr.forEach((player, username) => {
        const rb = rigidBodies.get(username)
        if (rb) {
            rb.setTranslation({ x: player.x, y: player.y, z: player.z }, true)
            }
        })
    wss.on('connection', (ws) => {
        ws.on('message', async (data) => {
            const msg = JSON.parse(data)
            
            if (msg.type === 'auth') {
                try {
                    const decoded = jwt.verify(msg.token, SECRET)
                    const username = decoded.usr
                    ws.username = username
                    connections.set(username, ws)
                    online_usr.set(username, new Player(0, 0, 0, 0, 0, 100,100,100,0,username))
                    const player = online_usr.get(ws.username);
                    const rb = world.createRigidBody(
                        RAPIER.RigidBodyDesc.dynamic().setTranslation(player.x, player.y, player.z))
                    rigidBodies.set(username, rb)
                    colliderMap.set(collider.handle, { type: 'player', username: ws.username})
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
                    const initial_h = player.health
                    const initial_hunger = player.hunger
                    const initial_thirst = player.thirst
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
                                    online_usr.set(ws.username, new Player(new_x,new_y,new_z,new_yaw,new_pitch,initial_h,initial_hunger,initial_thirst,0,ws.username))
                                }
                } catch {
                    ws.close()
                }
            }
            if (msg.type === 'shoot') {
                try {
                    const player = online_usr.get(ws.username)
                    const angles = msg.angle
                    const initial_x = player.x
                    const initial_y = player.y
                    const initial_z = player.z
                    const gun = player.hand
                    const range = await range_fron_weapon.get("SELECT * FROM range WHERE gun_name = ?", [gun]).range
                    const yaw = angles.yaw
                    const pitch = angles.pitch
                    const initial_h = player.health
                    const initial_hunger = player.hunger
                    const initial_thirst = player.thirst
                        const dir = DirectionsFromAngle(player.yaw, player.pitch)
                        const result = ballisticRaycast(
                            { x: player.x, y: player.y, z: player.z },
                            dir,
                            range,
                            9.81,
                            5,
                            100,
                            world
                        )
                        const impact = colliderMap.get(result.collider.handle)
                        if (impact.type == 'player'){
                            const player_name = impact.username
                            const player = online_usr.get(player_name)
                            const angles = msg.angle
                            const initial_x = player.x
                            const initial_y = player.y
                            const initial_z = player.z
                            const gun = player.hand
                            const yaw = angles.yaw
                            const pitch = angles.pitch
                            const initial_h = player.health
                            const initial_hunger = player.hunger
                            const initial_thirst = player.thirst
                            const new_health = initial_h -= gun_dmg
                            online_usr.set(player_name, new Player(initial_x,initial_y,initial_z,yaw,pitch,new_health,initial_hunger,initial_thirst,gun,player_name))
                        }
                } catch {
                    ws.close()
                }
            }
        })
        ws.on('close', () => {
            connections.delete(ws.username)
            online_usr.delete(ws.username)
            world.removeRigidBody(rigidBodies.get(ws.username))
            rigidBodies.delete(ws.username)
        })
    })
    console.log(`
╔══════════════════════════╗
║  Game Server launched    ║
╚══════════════════════════╝`)
    const PORT = process.env.PORT_GAME;
    app.listen(PORT, () => {
        console.log(`Server started on port ${PORT}`);
    });
}

start().catch(err => console.error(err));