import { PlayerSchema } from "./schema/PlayerSchema";
import { HardwareRig } from "./hardware_rigs/HardwareRig";
import { Avatar } from "./avatars/Avatar";
import { Game } from "./Game";

import { DebugAvatar } from "./avatars/DebugAvatar";
import { FullBodyAvatar } from "./avatars/FullBodyAvatar";

import { Room } from "colyseus.js";
import { Scene, WebXRDefaultExperience } from "@babylonjs/core";
import { SimpleAvatar } from "./avatars/SimpleAvatar";
import { HardwareRigUpdateMessageType } from "./schema/HardwareRigSchema";
import { XRRig } from "./hardware_rigs/XRRig";
import { XSensXRRig } from "./hardware_rigs/XSensXRRig";
import { NetworkRig } from "./hardware_rigs/NetworkRig";

export class Player {
    scene: Scene;
    game: Game;
    room: Room;
    id: string;

    state: PlayerSchema;

    rig: HardwareRig;

    avatar: Avatar | undefined;
    debugAvatar: Avatar | undefined;

    onChangeCallbacks: (() => void)[] = [];

    constructor(
        playerState: PlayerSchema,
        scene: Scene,
        game: Game,
        room: Room,
        isMe: boolean,
        xr: WebXRDefaultExperience
    ) {
        this.scene = scene;
        this.avatar = undefined;
        this.game = game;
        this.room = room;
        this.id = playerState.sessionId;
        this.state = playerState;

        if (isMe) {
            this.rig = new XRRig(xr); // default
        } else {
            this.rig = new NetworkRig(xr); // TODO: xr should not have to be passed here
        }

        const debugAvatar = new DebugAvatar(this.scene, this.rig);
        debugAvatar.setEnabled(false);
        this.debugAvatar = debugAvatar;

        if (isMe) {
            room.send(HardwareRigUpdateMessageType, {
                sessionId: room.sessionId,
                rigType: this.rig.getRigType(),
            });
        }

        // Add listeners for player state changes
        playerState.onChange = () => {
            for (let i = 0; i < this.onChangeCallbacks.length; i++) {
                this.onChangeCallbacks[i]();
            }
        };

        let lastTime = Date.now();
        this.addOnChangeCallback(() => {
            const dt = (Date.now() - lastTime) / 1000;
            this.rig.networkUpdate(playerState, room, dt);
            lastTime = Date.now();
        });

        const setRig = () => {
            if (isMe) {
                if (
                    playerState.hardwareRig.rigType === XRRig.getRigType() &&
                    this.rig.getRigType() !== XRRig.getRigType()
                ) {
                    this.rig = new XRRig(xr);
                } else if (
                    playerState.hardwareRig.rigType ===
                        XSensXRRig.getRigType() &&
                    this.rig.getRigType() !== XSensXRRig.getRigType()
                ) {
                    this.rig = new XSensXRRig(playerState.hardwareRig, xr);
                }

                this.avatar?.setRig(this.rig);
                this.debugAvatar?.setRig(this.rig);
            }
        };

        playerState.hardwareRig.listen("rigType", setRig);

        const setAvatar = () => {
            // hot-swappable avatars
            const avatarType = playerState.avatar.avatarType;
            if (
                this.avatar?.getAvatarType() !== avatarType &&
                !(avatarType === "undefined" && this.avatar === undefined)
            ) {
                this.setAvatar(avatarType, playerState.avatar.character);
            }
        };

        playerState.avatar.listen("avatarType", setAvatar);
    }

    destroy() {
        this.avatar?.destroy();
        this.debugAvatar?.destroy();
    }

    addOnChangeCallback(cb: () => void) {
        this.onChangeCallbacks.push(cb);
    }

    update(deltaTime: number) {
        this.avatar?.update();
        this.debugAvatar?.update();

        this.rig.update(this.state, this.room, deltaTime);

        if (this.rig.aTriggered)
            this.calibrate(true);

        if (this.rig.bTriggered)
            this.game.setDebugMode(!this.game.getDebugMode());

    }

    isMe(): boolean {
        return this.rig.isMe();
    }

    async calibrate(immediate: boolean) {
        if (!immediate) {
            console.log("Calibrating in 3");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log("Calibrating in 2");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log("Calibrating in 1");
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        await this.rig.calibrate(this.room);
        await this.avatar?.calibrate();
        await this.debugAvatar?.calibrate();
    }

    setAvatar(avatarType?: string, character?: string) {
        console.log(
            "Setting avatar to " + avatarType + " with character " + character
        );
        this.avatar?.destroy();
        if (avatarType === "undefined") {
            this.avatar?.destroy();
            this.avatar = undefined;
        } else if (avatarType === DebugAvatar.getAvatarType()) {
            throw new Error(
                "Debug avatar is not hot-swappable, since every player already gets one"
            );
        } else if (avatarType === FullBodyAvatar.getAvatarType()) {
            if (character === undefined)
                throw new Error("Character is undefined");
            const fullBodyAvatar = new FullBodyAvatar(
                this.scene,
                this.rig,
                character,
                this.id
            );
            fullBodyAvatar.setEnabled(true);
            this.avatar = fullBodyAvatar;
        } else if (avatarType === SimpleAvatar.getAvatarType()) {
            if (character === undefined)
                throw new Error("Character is undefined");
            const simpleAvatar = new SimpleAvatar(
                this.scene,
                this.rig,
                character,
                this.id
            );
            simpleAvatar.setEnabled(true);
            this.avatar = simpleAvatar;
        }
    }
}
