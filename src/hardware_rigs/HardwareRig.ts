

// Abstract class
export abstract class HardwareRig {

    static getRigType(): string {
        throw new Error("Abstract method not implemented");
    }

    static isMe(): boolean {
        throw new Error("Abstract method not implemented");
    }
    
}
