import { PlayerSchema } from "./schema/PlayerSchema";
import { HardwareRig } from "./hardware_rigs/HardwareRig";
import { Avatar } from "./avatars/Avatar";

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
    room: Room;

    rig: HardwareRig;

    avatar: Avatar | undefined;
    debugAvatar: Avatar | undefined;

    onChangeCallbacks: (() => void)[] = [];

    constructor(
        playerState: PlayerSchema,
        scene: Scene,
        room: Room,
        isMe: boolean,
        xr: WebXRDefaultExperience
    ) {
        this.scene = scene;
        this.avatar = undefined;
        this.room = room;

        if (isMe) {
            this.rig = new XRRig(xr); // default
        } else {
            this.rig = new NetworkRig();
        }

        const debugAvatar = new DebugAvatar(this.scene, this.rig);
        debugAvatar.setEnabled(true);
        this.debugAvatar = debugAvatar;

        room.send(HardwareRigUpdateMessageType, {
            sessionId: room.sessionId,
            rigType: this.rig.getRigType(),
        });

        // Add listeners for player state changes
        playerState.onChange = () => {
            for (let i = 0; i < this.onChangeCallbacks.length; i++) {
                this.onChangeCallbacks[i]();
            }
        };

        this.addOnChangeCallback(() => {
            this.rig.networkUpdate(playerState, room);
        });

        playerState.hardwareRig.listen("rigType", () => {
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
        });

        playerState.avatar.listen("avatarType", () => {
            // hot-swappable avatars
            const avatarType = playerState.avatar.avatarType;
            if (
                this.avatar?.getAvatarType() !== avatarType &&
                !(avatarType === "undefined" && this.avatar === undefined)
            ) {
                this.setAvatar(avatarType, playerState.avatar.character);
            }
        });
    }

    addOnChangeCallback(cb: () => void) {
        this.onChangeCallbacks.push(cb);
    }

    update() {
        this.avatar?.update();
        this.debugAvatar?.update();
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
        character = "BlueMonsterGirl"; // TODO: should not be hardcoded
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
            if (character === undefined) {
                throw new Error("Character is undefined");
            }
            const fullBodyAvatar = new FullBodyAvatar(
                this.scene,
                this.rig,
                character
            );
            fullBodyAvatar.setEnabled(true);
            this.avatar = fullBodyAvatar;
        } else if (avatarType === SimpleAvatar.getAvatarType()) {
            const simpleAvatar = new SimpleAvatar(this.scene, this.rig);
            simpleAvatar.setEnabled(true);
            this.avatar = simpleAvatar;
        }
    }
}
