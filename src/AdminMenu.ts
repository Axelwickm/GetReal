import { GetRealSchema } from "./schema/GetRealSchema";
import {
    PlayerSchema,
    PlayerSettingsUpdateMessage,
    PlayerSettingsUpdateMessageType,
    PlayerCalibrateMessageType,
    PlayerCalibrateMessage,
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
import {
    AvatarSchema,
    AvatarUpdateMessage,
    AvatarUpdateMessageType,
} from "./schema/AvatarSchema";
import {
    HardwareRigSchema,
    HardwareRigUpdateMessage,
    HardwareRigUpdateMessageType,
} from "./schema/HardwareRigSchema";
import { XRRig } from "./hardware_rigs/XRRig";
import { XSensXRRig } from "./hardware_rigs/XSensXRRig";
import { Game } from "./Game";

export class AdminMenu {
    private adminMenuElement: HTMLDivElement;
    private playersElement: HTMLDivElement;

    game: Game;
    room?: Room<GetRealSchema>;
    players: Map<string, PlayerSchema> = new Map();
    enabled: boolean = false;
    elements: Map<string, HTMLDivElement> = new Map();
    playerElements: Map<string, HTMLDivElement> = new Map();

    constructor(game: Game) {
        this.game = game;

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

        this.hide();
    }

    getElement(selector: string) {
        let element = this.elements.get(selector);
        if (!element) {
            element = this.adminMenuElement.querySelector(
                selector
            ) as HTMLDivElement;
            if (!element) {
                throw new Error(`Could not find element ${selector}`);
            }
            this.elements.set(selector, element);
        }
        return element;
    }

    getPlayerElement(playerId: string, selector: string) {
        let element = this.playerElements.get(playerId + selector);
        if (!element) {
            element = this.adminMenuElement.querySelector(
                "#player_" + playerId + " " + selector
            ) as HTMLDivElement;
            if (!element) {
                throw new Error(`Could not find element ${selector}`);
            }
            this.playerElements.set(playerId + selector, element);
        }
        return element;
    }

    show() {
        this.adminMenuElement.style.display = "block";
        this.enabled = true;
    }

    hide() {
        this.adminMenuElement.style.display = "none";
        this.enabled = false;
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

    registerPlayer(playerState: PlayerSchema, isMe: boolean) {
        this.players.set(playerState.cookieId, playerState);
        let playerElement = this.playersElement.querySelector(
            ".mainPlayer"
        ) as HTMLDivElement;
        if (!playerElement) {
            throw new Error("Could not find main player element");
        }

        if (!isMe) {
            // Make copy of first player element
            playerElement = playerElement.cloneNode(true) as HTMLDivElement;
            playerElement.className = "";
            this.playersElement.appendChild(playerElement);
        }

        playerElement.id = "player_" + playerState.sessionId;

        // Show menu if it's me and I am admin
        playerState.listen("isAdmin", (isAdmin: boolean) => {
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
                    sessionId: playerState.sessionId,
                    isAdmin: !playerState.isAdmin,
                });
            }
        });

        // Performer id
        const performerIdElement = playerElement.querySelector(
            ".performerId"
        ) as HTMLInputElement;
        performerIdElement.addEventListener("click", () => {
            let id = ((parseInt(performerIdElement.innerHTML) + 1 + 1) % 2) - 1;
            this.msgPlayerSettings({
                sessionId: playerState.sessionId,
                performerId: id,
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
                sessionId: playerState.sessionId,
                avatarType: "undefined",
            });
        });

        simpleAvatar.addEventListener("click", () => {
            this.msgAvatar({
                sessionId: playerState.sessionId,
                avatarType: SimpleAvatar.getAvatarType(),
            });
        });

        fullBodyAvatar.addEventListener("click", () => {
            this.msgAvatar({
                sessionId: playerState.sessionId,
                avatarType: FullBodyAvatar.getAvatarType(),
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
                sessionId: playerState.sessionId,
                rigType: XRRig.getRigType(),
            });
        });

        XSensXRElement.addEventListener("click", () => {
            this.msgHardwareRig({
                sessionId: playerState.sessionId,
                rigType: XSensXRRig.getRigType(),
            });
        });

        const CalibrateElement = playerElement.querySelector(
            ".calibrate"
        ) as HTMLInputElement;
        CalibrateElement.addEventListener("click", () => {
            this.msgCalibrate({
                sessionId: playerState.sessionId,
            });
        });

        // On player update, update the player element
        this.game.getPlayer(playerState.sessionId)?.addOnChangeCallback(() => {
            if (this.enabled) this.updatePlayerElement(playerState);
        });

        playerState.avatar.onChange = () => {
            if (this.enabled)
                this.updateAvatarElement(playerState.sessionId, playerState.avatar, playerElement);
        };

        playerState.hardwareRig.onChange = () => {
            if (this.enabled)
                this.updateHardwareRigElement(
                    playerState.sessionId,
                    playerState.hardwareRig,
                    playerElement
                );
        };
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

    msgCalibrate(msg: PlayerCalibrateMessage) {
        this.room?.send(PlayerCalibrateMessageType, msg);
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
        const allSoundModeElement = this.getElement("#allSound");
        const performerSoundModeElement = this.getElement("#performersSound");
        const audienceSoundModeElement = this.getElement("#audienceSound");
        const noneSoundModeElement = this.getElement("#noneSound");

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
        const spatialSoundModeElement = this.getElement("#spatialSound");
        const globalSoundModeElement = this.getElement("#globalSound");

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
        const audienceTeleportationModeElement = this.getElement(
            "#audienceTeleportationOn"
        );
        const audienceNoTeleportationModeElement = this.getElement(
            "#audienceTeleportationOff"
        );

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
            this.getElement("#nonAdminEnterVROn");
        const nonAdminEnterVROffModeElement = this.getElement(
            "#nonAdminEnterVROff"
        );

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

    updatePlayerElement(player: PlayerSchema) {
        const sid = player.sessionId;
        const sessionIdElement = this.getPlayerElement(sid, ".sessionId");
        sessionIdElement.innerHTML = player.sessionId;

        const cookieIdElement = this.getPlayerElement(sid, ".cookieId");
        cookieIdElement.innerHTML = player.cookieId;

        const performerIdElement = this.getPlayerElement(sid, ".performerId");
        performerIdElement.innerHTML = String(player.performerId);

        const adminElement = this.getPlayerElement(sid, ".isAdmin");
        adminElement.innerHTML = player.isAdmin ? "admin" : "regular";

        if (player.isAdmin) {
            adminElement.classList.add("admin");
        } else {
            adminElement.classList.remove("admin");
        }

        const headsetBatteryLevelElement = this.getPlayerElement(
            sid,
            ".headsetBatteryLevel"
        );
        // TODO

        const leftControllerBatteryLevelElement = this.getPlayerElement(
            sid,
            ".leftControllerBatteryLevel"
        );
        // TODO

        const rightControllerBatteryLevelElement = this.getPlayerElement(
            sid,
            ".rightControllerBatteryLevel"
        );
        // TODO

        const fpsElement = this.getPlayerElement(sid, ".fps");
        fpsElement.innerHTML = String(player.fps);

        const updateTimeElement = this.getPlayerElement(
            sid,
            ".updateTime"
        ) as HTMLInputElement;
        updateTimeElement.innerHTML = String(player.updateTime);

        const renderTimeElement = this.getPlayerElement(sid, ".renderTime");
        renderTimeElement.innerHTML = String(player.renderTime);
    }

    updateAvatarElement(sessionId: string, avatar: AvatarSchema, element: HTMLElement) {
        const noAvatar = this.getPlayerElement(sessionId, ".noAvatar");
        const simpleAvatar = this.getPlayerElement(sessionId, ".simpleAvatar"); 
        const fullBodyAvatar = this.getPlayerElement(sessionId, ".fullBodyAvatar"); 

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

    updateHardwareRigElement(
        sessionId: string,
        hardwareRig: HardwareRigSchema,
        element: HTMLElement
    ) {
        const xr = this.getPlayerElement(sessionId, ".XR");
        const xsensXr = this.getPlayerElement(sessionId, ".XSensXR");

        if (hardwareRig.rigType === XRRig.getRigType()) {
            this.activateElement(xr);
        } else if (hardwareRig.rigType === XSensXRRig.getRigType()) {
            this.activateElement(xsensXr);
        }
    }
}
