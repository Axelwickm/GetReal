import { GetRealSchema } from "./schema/GetRealSchema";
import {
    PlayerSchema,
    PlayerSettingsUpdateMessage,
    PlayerSettingsUpdateMessageType,
} from "./schema/PlayerSchema";
import {
    RoomSettingsUpdateMessage,
    RoomSettingsUpdateMessageType,
    SoundMode,
    SpatialSoundMode,
    AudienceTeleportationMode,
    NonAdminEnterVRImmediatelyMode,
} from "./schema/RoomSettingsSchema";

import { Room } from "colyseus.js";
import { SimpleAvatar } from "./avatars/SimpleAvatar";
import { FullBodyAvatar } from "./avatars/FullBodyAvatar";
import { AvatarSchema, AvatarUpdateMessage, AvatarUpdateMessageType } from "./schema/AvatarSchema";
import { HardwareRigSchema, HardwareRigUpdateMessage, HardwareRigUpdateMessageType } from "./schema/HardwareRigSchema";
import { XRRig } from "./hardware_rigs/XRRig";
import { XSensXRRig } from "./hardware_rigs/XSensXRRig";

export class AdminMenu {
    private adminMenuElement: HTMLDivElement;
    private playersElement: HTMLDivElement;

    room?: Room<GetRealSchema>;
    players: Map<string, PlayerSchema> = new Map();

    constructor() {
        this.adminMenuElement = document.getElementById(
            "adminMenu"
        ) as HTMLDivElement;
        if (!this.adminMenuElement) {
            throw new Error("Could not find admin menu element");
        }

        this.playersElement = this.adminMenuElement.querySelector(
            "#players"
        ) as HTMLDivElement;
        if (!this.playersElement) {
            throw new Error("Could not find players element");
        }

        // Find windowControl and add on click handler
        const windowControl = this.adminMenuElement.querySelector(
            "#windowControl"
        ) as HTMLDivElement;
        if (!windowControl) {
            throw new Error("Could not find windowControl element");
        }
        windowControl.addEventListener("click", () => {
            this.adminMenuElement.classList.toggle("minimized");
        });
    }

    show() {
        this.adminMenuElement.style.display = "block";
    }

    hide() {
        this.adminMenuElement.style.display = "none";
    }

    setRoom(room: Room<GetRealSchema>) {
        if (this.room) {
            throw new Error("Room already set");
        }
        this.room = room;

        this.room.state.room.listen("soundMode", (soundMode: string) => {
            this.setSoundMode(soundMode);
        });

        this.room.state.room.listen("spatialSoundMode", (soundMode: string) => {
            this.setSpatialSoundMode(soundMode);
        });

        this.room.state.room.listen(
            "audienceTeleportationMode",
            (mode: string) => {
                this.setAudienceTeleportationMode(mode);
            }
        );

        this.room.state.room.listen(
            "nonAdminEnterVRImmediatelyMode",
            (mode: string) => {
                this.setNonAdminEnterVRImmediatelyMode(mode);
            }
        );
    }

    registerPlayer(player: PlayerSchema, isMe: boolean) {
        this.players.set(player.cookieId, player);
        let playerElement = this.playersElement.querySelector(
            "#main_player"
        ) as HTMLDivElement;
        if (!playerElement) {
            throw new Error("Could not find main player element");
        }

        if (!isMe) {
            // Make copy of first player element
            playerElement = playerElement.cloneNode(true) as HTMLDivElement;
            playerElement.id = "player_" + player.cookieId;
            this.playersElement.appendChild(playerElement);
        }

        // Show menu if it's me and I am admin
        player.listen("isAdmin", (isAdmin: boolean) => {
            if (isMe && isAdmin) {
                this.show();
            } else if (isMe && !isAdmin) {
                this.hide();
            }
        });

        // On isAdmin click, send message to server
        const isAdminElement = playerElement.querySelector(
            ".isAdmin"
        ) as HTMLInputElement;
        isAdminElement.addEventListener("click", () => {
            if (!isMe) {
                this.msgPlayerSettings({
                    sessionId: player.sessionId,
                    isAdmin: !player.isAdmin,
                });
            }
        });

        // Performer id
        const performerIdElement = playerElement.querySelector(
            ".performerId"
        ) as HTMLInputElement;
        performerIdElement.addEventListener("click", () => {
            let id = (parseInt(performerIdElement.innerHTML) + 1 + 1) % 4 - 1;
            this.msgPlayerSettings({
                sessionId: player.sessionId,
                performerId: id
            });
        });


        // Avatar changes
        const noAvatar = playerElement.querySelector(
            ".noAvatar"
        ) as HTMLInputElement;
        const simpleAvatar = playerElement.querySelector(
            ".simpleAvatar"
        ) as HTMLInputElement;
        const fullBodyAvatar = playerElement.querySelector(
            ".fullBodyAvatar"
        ) as HTMLInputElement;

        noAvatar.addEventListener("click", () => {
            this.msgAvatar({
                sessionId: player.sessionId,
                avatarType: "undefined"
            });
        });

        simpleAvatar.addEventListener("click", () => {
            this.msgAvatar({
                sessionId: player.sessionId,
                avatarType: SimpleAvatar.getAvatarType()
            });
        });

        fullBodyAvatar.addEventListener("click", () => {
            this.msgAvatar({
                sessionId: player.sessionId,
                avatarType: FullBodyAvatar.getAvatarType()
            });
        });

        // Hardware rig changes
        const XRRigElement = playerElement.querySelector(
            ".XR"
        ) as HTMLInputElement;
        const XSensXRElement = playerElement.querySelector(
            ".XSensXR"
        ) as HTMLInputElement;

        XRRigElement.addEventListener("click", () => {
            this.msgHardwareRig({
                sessionId: player.sessionId,
                rigType: XRRig.getRigType()
            });
        });

        XSensXRElement.addEventListener("click", () => {
            this.msgHardwareRig({
                sessionId: player.sessionId,
                rigType: XSensXRRig.getRigType()
            });
        });

        // On player update, update the player element
        player.onChange = () => {
            this.updatePlayerElement(player, playerElement);
        };

        player.avatar.onChange = () => {
            this.updateAvatarElement(player.avatar, playerElement);
        }

        player.hardwareRig.onChange = () => {
            this.updateHardwareRigElement(player.hardwareRig, playerElement);
        }
    }

    unregisterPlayer(player: PlayerSchema) {
        this.players.delete(player.cookieId);
        const playerElement = this.playersElement.querySelector(
            "#player_" + player.cookieId
        ) as HTMLDivElement;
        this.playersElement.removeChild(playerElement);
    }

    setOffline(player: PlayerSchema) {
        const playerElement = this.playersElement.querySelector(
            "#player_" + player.cookieId
        ) as HTMLDivElement;
        playerElement.classList.add("offline");
    }

    msgPlayerSettings(msg: PlayerSettingsUpdateMessage) {
        this.room?.send(PlayerSettingsUpdateMessageType, msg);
    }

    msgRoomSettings(msg: RoomSettingsUpdateMessage) {
        this.room?.send(RoomSettingsUpdateMessageType, msg);
    }

    msgAvatar(msg: AvatarUpdateMessage) {
        this.room?.send(AvatarUpdateMessageType, msg);
    }

    msgHardwareRig(msg: HardwareRigUpdateMessage) {
        this.room?.send(HardwareRigUpdateMessageType, msg);
    }

    activateElement(element: HTMLElement) {
        const parent = element.parentElement;
        if (!parent) {
            throw new Error("Could not find parent element");
        }
        // Disable all parent's children
        for (let i = 0; i < parent.children.length; i++) {
            const child = parent.children[i] as HTMLElement;
            child.classList.remove("active");
        }
        // Enable this element
        element.classList.add("active");
    }

    setSoundMode(soundMode: string) {
        // allSound, performerSound, audienceSound, noneSound
        const allSoundModeElement = this.adminMenuElement.querySelector(
            "#allSound"
        ) as HTMLInputElement;
        const performerSoundModeElement = this.adminMenuElement.querySelector(
            "#performersSound"
        ) as HTMLInputElement;
        const audienceSoundModeElement = this.adminMenuElement.querySelector(
            "#audienceSound"
        ) as HTMLInputElement;
        const noneSoundModeElement = this.adminMenuElement.querySelector(
            "#noneSound"
        ) as HTMLInputElement;

        if (soundMode === "all") {
            this.activateElement(allSoundModeElement);
        } else if (soundMode === "performers") {
            this.activateElement(performerSoundModeElement);
        } else if (soundMode === "audience") {
            this.activateElement(audienceSoundModeElement);
        } else if (soundMode === "none") {
            this.activateElement(noneSoundModeElement);
        } else {
            throw new Error("Unknown sound mode: " + soundMode);
        }

        // Add on click handlers if not already added
        if (!allSoundModeElement.onclick) {
            allSoundModeElement.onclick = () => {
                this.msgRoomSettings({ soundMode: SoundMode.All });
            };
        }

        if (!performerSoundModeElement.onclick) {
            performerSoundModeElement.onclick = () => {
                this.msgRoomSettings({ soundMode: SoundMode.Performers });
            };
        }

        if (!audienceSoundModeElement.onclick) {
            audienceSoundModeElement.onclick = () => {
                this.msgRoomSettings({ soundMode: SoundMode.Audience });
            };
        }

        if (!noneSoundModeElement.onclick) {
            noneSoundModeElement.onclick = () => {
                this.msgRoomSettings({ soundMode: SoundMode.None });
            };
        }
    }

    setSpatialSoundMode(soundMode: string) {
        // spatialSound, globalSound
        const spatialSoundModeElement = this.adminMenuElement.querySelector(
            "#spatialSound"
        ) as HTMLInputElement;
        const globalSoundModeElement = this.adminMenuElement.querySelector(
            "#globalSound"
        ) as HTMLInputElement;

        if (soundMode === "spatial") {
            this.activateElement(spatialSoundModeElement);
        } else if (soundMode === "global") {
            this.activateElement(globalSoundModeElement);
        } else {
            throw new Error("Unknown sound mode: " + soundMode);
        }

        if (!spatialSoundModeElement.onclick) {
            spatialSoundModeElement.onclick = () => {
                this.msgRoomSettings({
                    spatialSoundMode: SpatialSoundMode.Spatial,
                });
            };
        }

        if (!globalSoundModeElement.onclick) {
            globalSoundModeElement.onclick = () => {
                this.msgRoomSettings({
                    spatialSoundMode: SpatialSoundMode.Global,
                });
            };
        }
    }

    setAudienceTeleportationMode(mode: string) {
        // audienceTeleportation, audienceNoTeleportation
        const audienceTeleportationModeElement =
            this.adminMenuElement.querySelector(
                "#audienceTeleportationOn"
            ) as HTMLInputElement;
        const audienceNoTeleportationModeElement =
            this.adminMenuElement.querySelector(
                "#audienceTeleportationOff"
            ) as HTMLInputElement;

        if (mode === "on") {
            this.activateElement(audienceTeleportationModeElement);
        } else if (mode === "off") {
            this.activateElement(audienceNoTeleportationModeElement);
        } else {
            throw new Error("Unknown audience teleportation mode: " + mode);
        }

        if (!audienceTeleportationModeElement.onclick) {
            audienceTeleportationModeElement.onclick = () => {
                this.msgRoomSettings({
                    audienceTeleportationMode: AudienceTeleportationMode.On,
                });
            };
        }

        if (!audienceNoTeleportationModeElement.onclick) {
            audienceNoTeleportationModeElement.onclick = () => {
                this.msgRoomSettings({
                    audienceTeleportationMode: AudienceTeleportationMode.Off,
                });
            };
        }
    }

    setNonAdminEnterVRImmediatelyMode(mode: string) {
        // nonAdminEnterVROn, nonAdminEnterVROff
        const nonAdminEnterVROnModeElement =
            this.adminMenuElement.querySelector(
                "#nonAdminEnterVROn"
            ) as HTMLInputElement;
        const nonAdminEnterVROffModeElement =
            this.adminMenuElement.querySelector(
                "#nonAdminEnterVROff"
            ) as HTMLInputElement;

        if (mode === "on") {
            this.activateElement(nonAdminEnterVROnModeElement);
        } else if (mode === "off") {
            this.activateElement(nonAdminEnterVROffModeElement);
        } else {
            throw new Error("Unknown nonAdminEnterVRImmediately mode: " + mode);
        }

        if (!nonAdminEnterVROnModeElement.onclick) {
            nonAdminEnterVROnModeElement.onclick = () => {
                this.msgRoomSettings({
                    nonAdminEnterVRImmediatelyMode:
                        NonAdminEnterVRImmediatelyMode.On,
                });
            };
        }

        if (!nonAdminEnterVROffModeElement.onclick) {
            nonAdminEnterVROffModeElement.onclick = () => {
                this.msgRoomSettings({
                    nonAdminEnterVRImmediatelyMode:
                        NonAdminEnterVRImmediatelyMode.Off,
                });
            };
        }
    }

    updatePlayerElement(player: PlayerSchema, element: HTMLElement) {
        // session_id, cookie_id, performer_id, admin,
        // headsetBatteryLevel, leftControllerBatteryLevel, rightControllerBatteryLevel,
        // frameRate, updateTime, renderTime
        // hardwareRig (XR or XSensXR)
        // avatar (No, SimpleAvatar, FullBodyAvatar)

        const sessionIdElement = element.querySelector(
            ".session_id"
        ) as HTMLInputElement;
        sessionIdElement.innerHTML = player.sessionId;

        const cookieIdElement = element.querySelector(
            ".cookie_id"
        ) as HTMLInputElement;
        cookieIdElement.innerHTML = player.cookieId;

        const performerIdElement = element.querySelector(
            ".performerId"
        ) as HTMLInputElement;
        performerIdElement.innerHTML = String(player.performerId);

        const adminElement = element.querySelector(
            ".isAdmin"
        ) as HTMLInputElement;
        adminElement.innerHTML = player.isAdmin ? "admin" : "regular";
        if (player.isAdmin) {
            adminElement.classList.add("admin");
        } else {
            adminElement.classList.remove("admin");
        }

        const headsetBatteryLevelElement = element.querySelector(
            ".headsetBatteryLevel"
        ) as HTMLInputElement;
        // TODO
        
        const leftControllerBatteryLevelElement = element.querySelector(
            ".leftControllerBatteryLevel"
        ) as HTMLInputElement;
        // TODO
        
        const rightControllerBatteryLevelElement = element.querySelector(
            ".rightControllerBatteryLevel"
        ) as HTMLInputElement;
        // TODO
        
        const fpsElement = element.querySelector(
            ".fps"
        ) as HTMLInputElement;
        fpsElement.innerHTML = String(player.fps);

        const updateTimeElement = element.querySelector(
            ".updateTime"
        ) as HTMLInputElement;
        updateTimeElement.innerHTML = String(player.updateTime);

        const renderTimeElement = element.querySelector(
            ".renderTime"
        ) as HTMLInputElement;
        renderTimeElement.innerHTML = String(player.renderTime);
    }

    updateAvatarElement(avatar: AvatarSchema, element: HTMLElement) {
        const noAvatar = element.querySelector(
            ".noAvatar"
        ) as HTMLInputElement;
        const simpleAvatar = element.querySelector(
            ".simpleAvatar"
        ) as HTMLInputElement;
        const fullBodyAvatar = element.querySelector(
            ".fullBodyAvatar"
        ) as HTMLInputElement;

        if (avatar.avatarType === "undefined") {
            this.activateElement(noAvatar);
        } else if (avatar.avatarType === SimpleAvatar.getAvatarType()) {
            this.activateElement(simpleAvatar);
        } else if (avatar.avatarType === FullBodyAvatar.getAvatarType()) {
            this.activateElement(fullBodyAvatar);
        } else {
            throw new Error("Unknown avatar: " + avatar.avatarType);
        }
    }

    updateHardwareRigElement(hardwareRig: HardwareRigSchema, element: HTMLElement) {
        const xr = element.querySelector(
            ".XR"
        ) as HTMLInputElement;
        const xsensXr = element.querySelector(
            ".XSensXR"
        ) as HTMLInputElement;

        if (hardwareRig.rigType === XRRig.getRigType()) {
            this.activateElement(xr);
        } else if(hardwareRig.rigType === XSensXRRig.getRigType()) {
            this.activateElement(xsensXr);
        }
    }
}
