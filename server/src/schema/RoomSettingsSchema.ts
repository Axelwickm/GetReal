import { Schema, type, } from "@colyseus/schema";

export enum SoundMode {
    Spatial = "spatial",
    Global = "global",
    PerformerOnly = "performer_only",
    AudienceOnly = "audience_only",
    Off = "off",
}

export enum AudienceTeleportationMode {
    Off = "off",
    On = "on",
}

export class RoomSettingsSchema extends Schema {
    @type("string") soundMode: SoundMode = SoundMode.Spatial;
    @type("string") audienceTeleportationMode: AudienceTeleportationMode = AudienceTeleportationMode.Off;
}

