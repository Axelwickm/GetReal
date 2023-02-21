import { Server } from "colyseus"
import { GetRealRoom, setXSensReaderInstance } from "./GetRealRoom"
import { XSensReader } from "./XSensReader"

// Instantiate XsensReader
const xsensReader = new XSensReader();
setXSensReaderInstance(xsensReader);
xsensReader.start();

/*
const gamePort = parseInt(process.env.PORT, 10) || 2567 
const gameServer = new Server()
gameServer.define("get_real", GetRealRoom, {})
console.log(`[GameServer] Listening on port: ${gamePort}`)
gameServer.listen(gamePort)*/
