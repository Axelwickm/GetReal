import { Schema, type } from "@colyseus/schema";

export const RoomSettingsUpdateMessageType = "roomSettingsUpdate";
export type RoomSettingsUpdateMessage = {
    soundMode?: SoundMode;
    spatialSoundMode?: SpatialSoundMode;
    audienceTeleportationMode?: AudienceTeleportationMode;
    nonAdminEnterVRImmediatelyMode?: NonAdminEnterVRImmediatelyMode;
    environment?: string;
};

export const SongMessageType = "song";
export type SongMessage = {
    song: string;
    songStartTime: number;
};

export enum SoundMode {
    All = "all",
    None = "none",
    Performers = "performers",
    Audience = "audience",
}

export enum SpatialSoundMode {
    Spatial = "spatial",
    Global = "global",
}

export enum AudienceTeleportationMode {
    Off = "off",
    On = "on",
}

export enum NonAdminEnterVRImmediatelyMode {
    Off = "off",
    On = "on",
}

export class RoomSettingsSchema extends Schema {
    @type("string") soundMode: SoundMode = SoundMode.None;
    @type("string") spatialSoundMode: SpatialSoundMode =
        SpatialSoundMode.Spatial;
    @type("string") audienceTeleportationMode: AudienceTeleportationMode =
        AudienceTeleportationMode.On;
    @type("string")
    nonAdminEnterVRImmediatelyMode: NonAdminEnterVRImmediatelyMode =
        NonAdminEnterVRImmediatelyMode.Off;
    @type("string") environment: string = "Lobbys";

    @type("string") song: string = "undefined";
    @type("number") songStartTime: number = 0;

    updateFromMessage(message: RoomSettingsUpdateMessage) {
        if (message.soundMode !== undefined) {
            this.soundMode = message.soundMode;
        }
        if (message.spatialSoundMode !== undefined) {
            this.spatialSoundMode = message.spatialSoundMode;
        }
        if (message.audienceTeleportationMode !== undefined) {
            this.audienceTeleportationMode = message.audienceTeleportationMode;
        }
        if (message.nonAdminEnterVRImmediatelyMode !== undefined) {
            this.nonAdminEnterVRImmediatelyMode =
                message.nonAdminEnterVRImmediatelyMode;
        }
        if (message.environment !== undefined) {
            this.environment = message.environment;
        }
    }

    updateSongFromMessage(message: SongMessage) {
        this.song = message.song;
        this.songStartTime = message.songStartTime;
    }
}
