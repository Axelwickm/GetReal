import { Room, Client } from "colyseus";

import { GetRealState, PlayerState } from "./schema/GetRealState";


export class GetRealRoom extends Room<GetRealState> {
    // When room is initialized
    onCreate(options: any) {
        this.setState(new GetRealState());
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
