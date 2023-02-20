

import { Avatar } from './Avatar';


export class SimpleAvatar extends Avatar {

    constructor() {
        super();
    }

    static getAvatarType(): string {
        return "simple";
    }
}
