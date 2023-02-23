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

    calibrate() {
        // TODO: this.rig.calibrate();
        this.avatar?.calibrate();
        this.debugAvatar?.calibrate();
    }
}


