
import { HardwareRig } from './hardware_rigs/HardwareRig';
import { Avatar } from './avatars/Avatar';

import { Vector3, Quaternion } from '@babylonjs/core';


type PlayerState = {
    name: string;
    position: Vector3;
    rotation: Quaternion;
}


export class Player {
    rig: HardwareRig | null;
    avatar: Avatar | null;

    constructor() {
        this.rig = null;
        this.avatar = null;
    }

    isMe(): boolean {
        // If rig is null, we will get the players state from the server
        return this.rig != null;
    }

}


