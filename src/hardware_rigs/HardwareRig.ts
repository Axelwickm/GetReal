import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";

// Abstract class
export abstract class HardwareRig {

    static getRigType(): string {
        throw new Error("Abstract method not implemented");
    }

    static isMe(): boolean {
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
