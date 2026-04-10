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
    constructor(x,z,y,yaw,pitch,health,hunger,thirst,inventory,hand,name) {
        this.x = x
        this.z = z
        this.y = y
        this.yaw = yaw
        this.pitch = pitch
        this.health = health
        this.hunger = hunger
        this.thirst = thirst
        this.inv = inventory
        this.hand = hand
        this.name = name
    }
}
const online_usr = new Map()
const SECRET = process.env.JWT_SECRET;

const connections = new Map()
async function start() {
    const weapon = await open({
        filename: 'guns.db',
        driver: sqlite3.Database
    });
    const user = await open({
        filename: 'user.db',
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
function calcDamage(weight_g, velocity, diameter_mm) {
    const mass = weight_g / 1000 // en kg
    const energy = 0.5 * mass * velocity * velocity // joules
    const sectional = Math.PI * (diameter_mm / 2000) ** 2 // section en m²
    return (energy / sectional) / 250000
}
function ballisticRaycast(origin, direction, speed, gravity, maxTime, steps, weight ,world) {
    const dt = maxTime / steps
    let pos = { ...origin }
    let vel = {
        x: direction.x * speed,
        y: direction.y * speed,
        z: direction.z * speed
    }
    const gravity = gravity * (weight / 1000)
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
                vellocity: Math.sqrt(vel.x**2 + vel.y**2 + vel.z**2)
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
                    let decoded = jwt.verify(msg.token, SECRET)
                    let username = decoded.usr
                    ws.username = username
                    connections.set(username, ws)
                    online_usr.set(username, new Player(0, 0, 0, 0, 0, 100,100,100,[],username))
                    let player = online_usr.get(ws.username);
                    let inventory = JSON.parse(user.run("SELECT * from users WHERE username = ?", [username]))
                    inventory = JSON.parse(rows[0].inventory);
                    if (inventory){
                        let rb = world.createRigidBody(
                        RAPIER.RigidBodyDesc.dynamic().setTranslation(player.x, player.y, player.z))
                        rigidBodies.set(username, rb)
                        colliderMap.set(collider.handle, { type: 'player', username: ws.username})
                        ws.send(JSON.stringify({ type: 'auth', status: 'OK' }))
                        ws.send(JSON.stringify({ type: 'inventory', status: inventory }))
                    }
                    else {
                        let rb = world.createRigidBody(
                        RAPIER.RigidBodyDesc.dynamic().setTranslation(player.x, player.y, player.z))
                        rigidBodies.set(username, rb)
                        colliderMap.set(collider.handle, { type: 'player', username: ws.username})
                        ws.send(JSON.stringify({ type: 'auth', status: 'OK' }))
                        user.run("UPDATE user; SET inventory = [{}]; WHERE username = ?;", [username])
                    }
                    
                } catch {
                    ws.close()
                }
            }
            if (msg.type === 'mouv') {
                try {
                    let mouv = msg.mouv
                    let player = online_usr.get(ws.username)
                    let initial_x = player.x
                    let initial_y = player.y
                    let initial_z = player.z
                    let new_x = mouv.x
                    let new_y = mouv.y
                    let new_z = mouv.z
                    let new_pitch = mouv.pitch
                    let new_yaw = mouv.yaw
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
                                    player.x = new_x;
                                    player.z = new_z;
                                    player.y = new_y;
                                    player.yaw = new_yaw;
                                    player.pitch = new_pitch;
                                    ws.send(JSON.stringify({ type: 'mouv', status: 'Granted' }))
                                }
                } catch {
                    ws.close()
                }
            }
            if (msg.type === 'shoot') {
                try {
                    let player = online_usr.get(ws.username)
                    let gun = player.hand
                    let ammo = gun.ammo
                    let current_weapon = JSON.parse(weapon.run("SELECT * from guns WHERE name = ?", [gun]))
                    let current_bullet = JSON.parse(weapon.run("SELECT * from guns WHERE ammo = ? AND name = ?", [ammo, current_weapon]))
                    let dir = DirectionsFromAngle(player.yaw, player.pitch)
                    let result = ballisticRaycast(
                        { x: player.x, y: player.y, z: player.z },dir, current_bullet.velocity, 9.81, 30,600,current_bullet.weight, world)
                    let gun_dmg = calcDamage(current_bullet.weight, result.vellocity, current_bullet.diameter)
                    let impact = colliderMap.get(result.collider.handle)
                    if (impact.type == 'player'){
                        let imp_player_name = impact.username
                        let imp_player = online_usr.get(imp_player_name)
                        let health = imp_player.health - gun_dmg
                        imp_player.health -= gun_dmg
                        let imp_p_ws = connections.get(imp_player_name)
                        imp_p_ws.send(JSON.stringify({ type: 'health', health: health  }))
                    }
                    ws.send(JSON.stringify({ type: 'shoot', status: 'Granted' }))
                    
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