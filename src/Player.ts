import { PlayerSchema } from "./schema/PlayerSchema";
import { HardwareRig } from './hardware_rigs/HardwareRig';
import { Avatar } from './avatars/Avatar';

import { Room } from 'colyseus.js';


export class Player {
    rig: HardwareRig;
    avatar: Avatar | null;
    debugAvatar: Avatar | null;

    constructor(playerState: PlayerSchema,
                rig: HardwareRig,
                avatar: Avatar | null,
                debugAvatar: Avatar | null,
                room: Room) {
        this.rig = rig;
        this.avatar = avatar;
        this.debugAvatar = debugAvatar;

        // Add listeners for player state changes
        playerState.onChange = (_change) => {
            console.log("player state changed!", _change);
            rig.networkUpdate(playerState, room);
        }
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("Calibrating in 2");
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("Calibrating in 1");
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.rig.calibrate();
        await this.avatar?.calibrate();
        await this.debugAvatar?.calibrate();
    }
}


