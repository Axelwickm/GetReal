import { MapSchema, Schema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
    @type("string") name: string = "Unknown";
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") z: number = 0;
}

export class GetRealState extends Schema {
    @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}
