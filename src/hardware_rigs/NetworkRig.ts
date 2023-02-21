import { HardwareRig } from './HardwareRig';
import { PlayerSchema } from "../schema/PlayerSchema";

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

