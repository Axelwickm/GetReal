import { Player } from "./Player";
import { HardwareRig } from "./hardware_rigs/HardwareRig";
import { GetRealSchema } from "./schema/GetRealSchema";
import { PlayerSchema } from "./schema/PlayerSchema";

import { XSensXRRig } from "./hardware_rigs/XSensXRRig";
import { NetworkRig } from "./hardware_rigs/NetworkRig";
import { DebugAvatar } from "./avatars/DebugAvatar";

import { Room } from "colyseus.js";
import { Scene } from "@babylonjs/core";

export class Game {
    private scene: Scene;
    private players: Map<string, Player> = new Map();
    private room?: Room<GetRealSchema>;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    setRoom(room: Room<GetRealSchema>) {
        if (this.room) {
            throw new Error("Room already set");
        }

        this.room = room;

        // Watch for incoming network changes
        room.state.players.onAdd = (
            playerState: PlayerSchema,
            sessionId: string
        ) => {
            console.log("player added!", playerState, sessionId);
            const isMe = sessionId === room.sessionId;
            let rig: HardwareRig;
            if (isMe) {
                rig = new XSensXRRig(); // TODO: be able to configure this
            } else {
                rig = new NetworkRig();
            }

            const avatar = new DebugAvatar(this.scene, rig); // TODO: be able to configure this

            // add player
            this.players.set(sessionId, new Player(playerState, rig, avatar));
        };

        room.state.players.onRemove = (
            playerState: PlayerSchema,
            sessionId: string
        ) => {
            console.log("player removed!", playerState, sessionId);
            this.players.delete(sessionId);
        };
    }

    update() {
        this.players.forEach((player) => {
            player.update();
        });
    }
}
