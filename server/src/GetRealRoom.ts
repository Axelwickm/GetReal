import { Room, Client } from "colyseus";
import { ArraySchema } from "@colyseus/schema";

import { GetRealSchema } from "./schema/GetRealSchema";
import { QuaternionSchema, Vector3Schema } from "./schema/MathSchema";
import { PlayerSchema } from "./schema/PlayerSchema";
import { XSensReader, XSensData } from "./XSensReader";

let xSensReaderInstance: XSensReader | null = null;
export function setXSensReaderInstance(instance: XSensReader) {
    xSensReaderInstance = instance;
}

export class GetRealRoom extends Room<GetRealSchema> {
    // When room is initialized
    onCreate(options: any) {
        console.log("GetRealRoom created!", options);
        this.setState(new GetRealSchema());

        // Set up XsensReader reader
        this.clock.setInterval(() => {
            if (xSensReaderInstance?.hasData()) {
                const data = xSensReaderInstance!.getLatestData();
                this.setPerformerXSensData(undefined, data);
            }
        }, 1000 / 50);
    }

    setPerformerXSensData(performerId: number | undefined, data: XSensData) {
        // If performerId is undefined, set the data for all performers
        this.state.players.forEach((player, sessionId) => {
            if (
                player.performerId === performerId ||
                (performerId === undefined && player.performerId !== -1)
            ) {
                // TODO: how should camera position be handled?
                // It should probably just be set by the client from the XR.

                
                // Update player
                player.hipPosition = new Vector3Schema(data.bonePositions[0][0], data.bonePositions[0][1], data.bonePositions[0][2]);
                player.hipRotation = new QuaternionSchema(data.boneRotations[0][0], data.boneRotations[0][1], data.boneRotations[0][2], data.boneRotations[0][3]);

                if (player.boneRotations.length !== data.boneRotations.length) {
                    player.boneRotations = new ArraySchema();
                    for (let i = 0; i < data.boneRotations.length; i++) {
                        player.boneRotations.push(new QuaternionSchema());
                    }
                }

                for (let i = 0; i < data.boneRotations.length; i++) {
                    player.boneRotations[i] = new QuaternionSchema(data.boneRotations[i][0], data.boneRotations[i][1], data.boneRotations[i][2], data.boneRotations[i][3]);
                }

                this.state.players.set(sessionId, player);

            }
        });
    }

    // Authorize client based on provided options before WebSocket handshake is complete
    //onAuth(client: Client, options: any, request: http.IncomingMessage) { }

    // When client successfully join the room
    onJoin(client: Client, options: any) {
        console.log(client.sessionId, "joined!");

        const player = new PlayerSchema();
        
        // TODO temporary. If first player, set preformerId to 0
        if (this.state.players.size === 0) {
            player.performerId = 0;
        }

        this.state.players.set(client.sessionId, player);
    }

    // When a client leaves the room
    onLeave(client: Client, consented: boolean) {
        console.log(client.sessionId, "left!");

        this.state.players.delete(client.sessionId);

        // Stop the interval when the player leaves
        this.clock.stop();
    }

    // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
    onDispose() {}
}
