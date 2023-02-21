import { MapSchema, Schema, type, } from "@colyseus/schema";
import { PlayerSchema } from "./PlayerSchema";
import { RoomSettingsSchema } from "./RoomSettingsSchema";

export class GetRealSchema extends Schema {
    @type(RoomSettingsSchema) room = new RoomSettingsSchema();
    @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
}
