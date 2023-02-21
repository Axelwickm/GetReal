
import { HardwareRig } from './HardwareRig';

export class NetworkRig extends HardwareRig {
    constructor() {
        super();
    }

    static getRigType(): string {
        return "network";
    }

    static isMe(): boolean {
        return false;
    }
}

