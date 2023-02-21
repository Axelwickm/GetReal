import { Player } from "./Player";
import { HardwareRig } from "./hardware_rigs/HardwareRig";
import { GetRealSchema } from "./schema/GetRealSchema";
import { PlayerSchema } from "./schema/PlayerSchema";

import { XSensXRRig } from "./hardware_rigs/XSensXRRig";
import { NetworkRig } from "./hardware_rigs/NetworkRig";
import { DebugAvatar } from "./avatars/DebugAvatar";

import { Room } from "colyseus.js";
import { Scene } from "@babylonjs/core";
import { FullBodyAvatar } from "./avatars/FullBodyAvatar";
import { AssetManager } from "./AssetManager";

export class Game {
    private scene: Scene;
    private players: Map<string, Player> = new Map();
    private room?: Room<GetRealSchema>;
    private debugMode: boolean = false;

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

            const debugAvatar = new DebugAvatar(this.scene, rig);
            debugAvatar.setEnabled(false);

            const character = AssetManager.getInstance().getCharacterOptions()[0];
            const fullBodyAvatar = new FullBodyAvatar(this.scene, rig, character);
            fullBodyAvatar.setEnabled(false);

            // add player
            this.players.set(sessionId, new Player(playerState, rig, fullBodyAvatar, debugAvatar));
        };

        room.state.players.onRemove = (
            playerState: PlayerSchema,
            sessionId: string
        ) => {
            console.log("player removed!", playerState, sessionId);
            this.players.delete(sessionId);
        };
    }

    update() : void {
        this.players.forEach((player) => {
            player.update();
        });
    }

    getDebugMode(): boolean {
        return this.debugMode;
    }

    setDebugMode(debugMode: boolean) {
        console.log("Game debug mode set to", debugMode);
        this.debugMode = debugMode;
        this.players.forEach((player) => {
            player.debugAvatar?.setEnabled(debugMode);
        });
    }
}
