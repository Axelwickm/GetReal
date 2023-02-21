
import { HardwareRig } from './HardwareRig';

export class XSensXRRig extends HardwareRig {
    constructor() {
        super();
    }

    static getRigType(): string {
        return "xsens_xr";
    }

    static isMe(): boolean {
        return true;
    }
}

