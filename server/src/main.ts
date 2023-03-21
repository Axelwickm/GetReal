import { Server as ColyseusServer } from "colyseus";
import { uWebSocketsTransport } from "@colyseus/uwebsockets-transport";
import { GetRealRoom, setXSensReaderInstance } from "./GetRealRoom";
import { XSensReader } from "./XSensReader";

// Instantiate XsensReader
const xsensReader = new XSensReader();
setXSensReaderInstance(xsensReader);
xsensReader.start();

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
