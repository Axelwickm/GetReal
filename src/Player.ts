import { PlayerSchema } from "./schema/PlayerSchema";
import { HardwareRig } from "./hardware_rigs/HardwareRig";
import { Avatar } from "./avatars/Avatar";

import { DebugAvatar } from "./avatars/DebugAvatar";
import { FullBodyAvatar } from "./avatars/FullBodyAvatar";

import { Room } from "colyseus.js";
import { Scene } from "@babylonjs/core";
import { SimpleAvatar } from "./avatars/SimpleAvatar";

export class Player {
    scene: Scene;

    rig: HardwareRig;

    avatar: Avatar | undefined;
    debugAvatar: Avatar | undefined;

    constructor(
        playerState: PlayerSchema,
        scene: Scene,
        rig: HardwareRig,
        room: Room
    ) {
        this.scene = scene;
        this.rig = rig;
        this.avatar = undefined;

        const debugAvatar = new DebugAvatar(this.scene, rig);
        debugAvatar.setEnabled(true);
        this.debugAvatar = debugAvatar;

        // Add listeners for player state changes
        playerState.onChange = (_change) => {
            rig.networkUpdate(playerState, room);

            // hot-swappable avatars
            const avatarType = playerState.avatar.avatarType;
            if (
                this.avatar?.getAvatarType() !== avatarType &&
                !(avatarType === "undefined" && this.avatar === undefined)
            ) {
                this.setAvatar(avatarType, playerState.avatar.character);
            }
        };
    }

    update() {
        this.avatar?.update();
        this.debugAvatar?.update();
    }

    isMe(): boolean {
        return this.rig.isMe();
    }

    async calibrate() {
        console.log("Calibrating in 3");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log("Calibrating in 2");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log("Calibrating in 1");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await this.rig.calibrate();
        await this.avatar?.calibrate();
        await this.debugAvatar?.calibrate();
    }

    setAvatar(avatarType?: string, character?: string) {
        console.log(
            "Setting avatar to " + avatarType + " with character " + character
        );
        this.avatar?.destroy();
        if (avatarType === undefined) {
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
