import { PlayerSchema } from "./schema/PlayerSchema";

import { HardwareRig } from './hardware_rigs/HardwareRig';
import { Avatar } from './avatars/Avatar';


export class Player {
    rig: HardwareRig;
    avatar: Avatar | null;

    constructor(playerState: PlayerSchema,
                rig: HardwareRig,
                avatar: Avatar | null) {
        this.rig = rig;
        this.avatar = avatar;

        // Add listeners for player state changes
        playerState.onChange = () => {
            rig.networkUpdate(playerState);
        }
    }

    update() {
        if (this.avatar) {
            this.avatar.update();
        }
    }
}


