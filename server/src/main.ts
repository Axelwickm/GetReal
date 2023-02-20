import { Server } from "colyseus"
import { GetRealRoom } from "./GetRealRoom"

const port = parseInt(process.env.PORT, 10) || 2567 

const gameServer = new Server()
gameServer.define("get_real", GetRealRoom, {});
gameServer.listen(port)
console.log(`[GameServer] Listening on Port: ${port}`)
