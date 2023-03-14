import { Server } from "colyseus";
import { uWebSocketsTransport } from "@colyseus/uwebsockets-transport";
import { GetRealRoom, setXSensReaderInstance } from "./GetRealRoom";
import { XSensReader } from "./XSensReader";
import { PeerServer } from "peer";
import * as fs from "fs";

// Instantiate XsensReader
const xsensReader = new XSensReader();
setXSensReaderInstance(xsensReader);
xsensReader.start();

// Instantiate PeerServer
const peerPort = 9000;
const peerServer = PeerServer({
    port: peerPort,
    path: "/peerjs",
    ssl: {
        key: fs.readFileSync("certs/ssl.key").toString(),
        cert: fs.readFileSync("certs/ssl.cert").toString(),
    },
});
console.log(`[PeerServer] PeerServer Listening on port: ${peerPort}`);
peerServer.listen();

// Instantiate Colyseus Server
const gamePort = parseInt(process.env.PORT, 10) || 2567;
const gameServer = new Server({
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

