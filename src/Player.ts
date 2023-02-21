import { PlayerSchema } from "./schema/PlayerSchema";

import { HardwareRig } from './hardware_rigs/HardwareRig';
import { Avatar } from './avatars/Avatar';


export class Player {
    rig: HardwareRig;
    avatar: Avatar | null;
    debugAvatar: Avatar | null;

    constructor(playerState: PlayerSchema,
                rig: HardwareRig,
                avatar: Avatar | null,
                debugAvatar: Avatar | null) {
        this.rig = rig;
        this.avatar = avatar;
        this.debugAvatar = debugAvatar;

        // Add listeners for player state changes
        playerState.onChange = (change) => {
            rig.networkUpdate(playerState);
        }
    }

    update() {
        this.avatar?.update();
        this.debugAvatar?.update();
    }
}


