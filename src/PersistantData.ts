
type StoredData = {
    cookieId: string;
    name: string;
    isAdmin: boolean;
};

export class PersistantData {
    private static _instance: PersistantData
    private _data: StoredData;

    public get data(): StoredData {
        return this._data;
    }

    public set data(data: StoredData) {
        this._data = data;
        this.saveDataToLocalStorage();
    }

    private constructor() {
        // private constructor
        const data = this.getDataFromLocalStorage();

        this._data = {
            cookieId: data.cookieId || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            name: data.name || "Anonymous",
            isAdmin: data.isAdmin || false,
        };

        this.saveDataToLocalStorage(); 

        console.log("Stored CookieId: " + this._data.cookieId);
        console.log("Stored Name: " + this._data.name);
    }

    public static getInstance(): PersistantData {
        if (!PersistantData._instance) {
            PersistantData._instance = new PersistantData();
        }
        return PersistantData._instance;
    }

    private getDataFromLocalStorage(): Partial<StoredData> {
        const data = localStorage.getItem("data");
        if (data) {
            return JSON.parse(data);
        }
        return {};
    } 

    public saveDataToLocalStorage(): void {
        localStorage.setItem("data", JSON.stringify(this._data));
    }
}