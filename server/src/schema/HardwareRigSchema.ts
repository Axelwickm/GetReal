import { ArraySchema, Schema, type, } from "@colyseus/schema";


export const HardwareRigUpdateMessageType = "hardwareRigUpdate";
export type HardwareRigUpdateMessage = {
    sessionId: string; // What player should update
    rigType: string;
}

export class HardwareRigSchema extends Schema {
    @type("string") rigType: string = "xr";

    updateFromMessage(message: HardwareRigUpdateMessage) {
        this.rigType = message.rigType ?? this.rigType;
    }
}