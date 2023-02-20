import { Avatar } from './Avatar';


export class FullBodyAvatar extends Avatar {

    constructor() {
        super();
    }

    static getAvatarType(): string {
        return "full_body";
    }
}
