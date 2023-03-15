import { Room, Client } from "colyseus";
import { ArraySchema, MapSchema } from "@colyseus/schema";

import { GetRealSchema } from "./schema/GetRealSchema";
import {
    RoomSettingsSchema,
    RoomSettingsUpdateMessage,
    RoomSettingsUpdateMessageType,
} from "./schema/RoomSettingsSchema";
import { QuaternionSchema, Vector3Schema } from "./schema/MathSchemas";
import {
    PlayerSchema,
    PlayerSettingsUpdateMessageType,
    PlayerSettingsUpdateMessage,
    PlayerTransformUpdateMessage,
    PlayerTransformUpdateMessageType,
    PlayerCalibrateMessageType,
    PlayerCalibrateMessage,
} from "./schema/PlayerSchema";
import { XSensReader, XSensData, XSENS_BONE_NAME_ARRAY } from "./XSensReader";
import {
    AvatarUpdateMessageType,
    AvatarUpdateMessage,
} from "./schema/AvatarSchema";
import {
    HardwareRigSchema,
    HardwareRigUpdateMessage,
    HardwareRigUpdateMessageType,
} from "./schema/HardwareRigSchema";

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
        }, 1000 / 90);

        // Message handlers
        this.onMessage(
            RoomSettingsUpdateMessageType,
            (client, message: RoomSettingsUpdateMessage) => {
                this.state.room.updateFromMessage(message);
            }
        );

        this.onMessage(
            PlayerSettingsUpdateMessageType,
            (client, message: PlayerSettingsUpdateMessage) => {
                const playerState = this.state.players.get(message.sessionId);
                playerState?.updateFromSettingsMessage(message);
                if (message.name) {
                    console.log("Player name is: ", message.name);
                    for (const otherPlayerState of this.state.players.values()) {
                        if (otherPlayerState?.cookieId && playerState?.cookieId &&
                            otherPlayerState.cookieId === playerState.cookieId
                        ) {
                            // Same browser, meaning same session storage.
                            // Let already update the name here, to avoid confusion.
                            otherPlayerState.name = message.name;
                        }
                    }
                }
            }
        );

        this.onMessage(
            HardwareRigUpdateMessageType,
            (client, message: HardwareRigUpdateMessage) => {
                this.state.players
                    .get(message.sessionId)
                    ?.hardwareRig.updateFromMessage(message);
            }
        );

        this.onMessage(
            AvatarUpdateMessageType,
            (client, message: AvatarUpdateMessage) => {
                this.state.players
                    .get(message.sessionId)
                    ?.avatar.updateFromMessage(message);
            }
        );

        this.onMessage(
            PlayerTransformUpdateMessageType,
            (client, message: PlayerTransformUpdateMessage) => {
                // Players can only change the  ir own transform
                if (client.sessionId !== message.sessionId) {
                    console.warn(
                        "Player tried to change transform for another player. Aka cheating."
                    );
                    return;
                } else {
                    this.state.players
                        .get(message.sessionId)
                        ?.updateFromTransformMessage(message);
                }
            }
        );

        // Events
        this.onMessage(
            PlayerCalibrateMessageType,
            (client, message: PlayerCalibrateMessage) => {
                console.log("Calibrating player", message.sessionId);
                this.broadcast(PlayerCalibrateMessageType, message);
            }
        );
    }

    setPerformerXSensData(performerId: number | undefined, data: XSensData) {
        // If performerId is undefined, set the data for all performers
        this.state.players.forEach((player, sessionId) => {
            if (
                (player.hardwareRig.rigType === "xsens_xr" &&
                    player.performerId === performerId) ||
                (performerId === undefined && player.performerId !== -1)
            ) {
                // Update player
                player.bonePositions = new MapSchema<Vector3Schema>();
                for (let i = 0; i < data.bonePositions.length; i++) {
                    player.bonePositions.set(
                        XSENS_BONE_NAME_ARRAY[i],
                        new Vector3Schema(
                            data.bonePositions[i][0],
                            data.bonePositions[i][1],
                            data.bonePositions[i][2]
                        )
                    );
                }

                player.boneRotations = new MapSchema<QuaternionSchema>();
                for (let i = 0; i < data.boneRotations.length; i++) {
                    player.boneRotations.set(
                        XSENS_BONE_NAME_ARRAY[i],
                        new QuaternionSchema(
                            data.boneRotations[i][0],
                            data.boneRotations[i][1],
                            data.boneRotations[i][2],
                            data.boneRotations[i][3]
                        )
                    );
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
        player.sessionId = client.sessionId;

        // First player to join becomes admin
        if (this.state.players.size === 0) {
            player.isAdmin = true;
        }

        this.state.players.set(client.sessionId, player);
    }

    // When a client leaves the room
    onLeave(client: Client, consented: boolean) {
        console.log(client.sessionId, "left!");

        this.state.players.delete(client.sessionId);
        if (this.state.players.size === 1) {
            // If there is only one player left, make them admin
            this.state.players.forEach((player, sessionId) => {
                player.isAdmin = true;
            });
        }

        // Stop the interval when the player leaves
        this.clock.stop();
    }

    // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
    onDispose() {}
}
