import { Room, Client } from "colyseus";

import { GetRealState, PlayerState } from "./schema/GetRealState";
import { XSensReader } from "./XSensReader";


let xSensReaderInstance: XSensReader | null = null;
export function setXSensReaderInstance(instance: XSensReader) {
    xSensReaderInstance = instance;
}

export class GetRealRoom extends Room<GetRealState> {
    // When room is initialized
    onCreate(options: any) {
        console.log("GetRealRoom created!", options);
        this.setState(new GetRealState());

        // Set up XsensReader reader 
        this.clock.setInterval(() => {
            if (xSensReaderInstance?.hasData()) {
                const data = xSensReaderInstance!.getLatestData();
                this.state.xsensData = data;
            }
        }, 50);
    }

    // Authorize client based on provided options before WebSocket handshake is complete
    //onAuth(client: Client, options: any, request: http.IncomingMessage) { }

    // When client successfully join the room
    onJoin(client: Client, options: any) {
        console.log(client.sessionId, "joined!");

        const player = new PlayerState();

        const FLOOR_SIZE = 500;
        player.x = -(FLOOR_SIZE / 2) + (Math.random() * FLOOR_SIZE);
        player.y = -1;
        player.z = -(FLOOR_SIZE / 2) + (Math.random() * FLOOR_SIZE);

        this.state.players.set(client.sessionId, player);

        // Move player randomly on each interval
        this.clock.setInterval(() => {
            player.x += Math.random() * 20 - 10;
            player.z += Math.random() * 20 - 10;
            console.log("player moved to", player.x, player.z);
            this.state.players.set(client.sessionId, player);
        }
        , 50);
    }


    // When a client leaves the room
    onLeave(client: Client, consented: boolean) {
        console.log(client.sessionId, "left!");

        this.state.players.delete(client.sessionId);

        // Stop the interval when the player leaves
        this.clock.stop();
    }

    // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
    onDispose() { }
}
