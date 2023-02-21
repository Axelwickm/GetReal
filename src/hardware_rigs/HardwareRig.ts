import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
import { PlayerSchema } from "../schema/PlayerSchema";

// Abstract class
export abstract class HardwareRig {

    static getRigType(): string {
        throw new Error("Abstract method not implemented");
    }

    static isMe(): boolean {
        throw new Error("Abstract method not implemented");
    }

    networkUpdate(state: PlayerSchema) {
        // This is called from Player, so no need to add own listeners
        throw new Error("Abstract method not implemented");
    }

    getCameraTransform(): { position: Vector3, rotation: Quaternion } {
        throw new Error("Abstract method not implemented");
    }

    // TODO: controller states (transforms + actions)
    
    
    getHipTransform(): { position: Vector3, rotation: Quaternion } {
        throw new Error("Abstract method not implemented");
    }

    getBoneRotations(): Array<Quaternion> {
        throw new Error("Abstract method not implemented");
    }
}
