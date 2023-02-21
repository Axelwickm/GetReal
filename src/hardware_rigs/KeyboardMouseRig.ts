

import { HardwareRig } from './HardwareRig';

export class KeyboardMouseRig extends HardwareRig {
    constructor() {
        super();
    }

    static getRigType(): string {
        return "keyboard_mouse";
    }

    static isMe(): boolean {
        return true;
    }
}
