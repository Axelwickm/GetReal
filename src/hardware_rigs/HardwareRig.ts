import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { PlayerSchema } from "../schema/PlayerSchema";

import { Room } from "colyseus.js";

// Abstract class
export abstract class HardwareRig {

    static getRigType(): string {
        throw new Error("Abstract method not implemented");
    }

    getRigType(): string {
        throw new Error("Abstract method not implemented");
    }

    isMe(): boolean {
        throw new Error("Abstract method not implemented");
    }

    networkUpdate(state: PlayerSchema, room: Room, deltaTime: number) {
        // This is called from Player, so no need to add own listeners
        throw new Error("Abstract method not implemented");
    }

    getCameraTransform(): [Vector3, Quaternion] {
        throw new Error("Abstract method not implemented");
    }

    // TODO: controller states (transforms + actions)
    

    getBoneTransforms(): Array<[Vector3, Quaternion]> {
        throw new Error("Abstract method not implemented");
    }

    async calibrate(room: Room) {
        throw new Error("Abstract method not implemented");
    }
}
