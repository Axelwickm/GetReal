import { Server as ColyseusServer } from "colyseus";
import { uWebSocketsTransport } from "@colyseus/uwebsockets-transport";
import { GetRealRoom, setXSensReaderInstance } from "./GetRealRoom";
import { XSensReader } from "./XSensReader";
import * as fs from "fs";
import https from "https";
import { Server as SocketIOServer } from "socket.io";

// Instantiate XsensReader
const xsensReader = new XSensReader();
setXSensReaderInstance(xsensReader);
xsensReader.start();

// Instantiate Socket io server
const httpsServer = https.createServer({
    key: fs.readFileSync("certs/ssl.key"),
    cert: fs.readFileSync("certs/ssl.cert"),
});
const io = new SocketIOServer(httpsServer, {});
io.on("connection", (socket) => {
    console.log("a user connected");
    socket.on("disconnect", () => {
        console.log("user disconnected");
    });
});

httpsServer.listen(9000, () => {
    console.log("[SocketIO] Listening on port: 9000");
});

// Instantiate Colyseus Server
const gamePort = parseInt(process.env.PORT, 10) || 2567;
const gameServer = new ColyseusServer({
    transport: new uWebSocketsTransport(
        {},
        {
            key_file_name: "certs/ssl.key",
            cert_file_name: "certs/ssl.cert",
        }
    ),
});

gameServer.define("get_real", GetRealRoom, {});
console.log(`[GameServer] Colyseus listening on port: ${gamePort}`);
gameServer.listen(gamePort);
