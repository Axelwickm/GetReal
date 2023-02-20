
import { HardwareRig } from './HardwareRig';

export class XRRig extends HardwareRig {
    constructor() {
        super();
    }

    static getRigType(): string {
        return "xr";
    }
}
