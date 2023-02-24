
import { HardwareRig } from './HardwareRig';
import { PlayerSchema } from '../schema/PlayerSchema';

import { Room } from 'colyseus.js';
import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";


export class KeyboardMouseRig extends HardwareRig {
    constructor() {
        super();
    }

    static getRigType(): string {
        return "keyboard_mouse";
    }

    isMe(): boolean {
        return true;
    }

    async calibrate() {

    }

    networkUpdate(state: PlayerSchema, room: Room) {

    }

    getCameraTransform(): [Vector3, Quaternion] {
        return [new Vector3(), new Quaternion()];
    }

    getBoneTransforms(): Array<[Vector3, Quaternion]> {
        return []; // Has no bones.
    }
}
