/**
 * Device-Based Profile & Local Storage Isolation Manager
 * Stores all user data, playlists, favorites, preferences, and now-playing state
 * exclusively on the end-user machine (Local Device Storage & IndexedDB).
 * Zero cloud dependency, zero external databases.
 */

class DeviceProfileManager {
    constructor() {
        this.PROFILES_KEY = 'lossless_device_profiles_v1';
        this.ACTIVE_ID_KEY = 'lossless_active_profile_id_v1';
        this.profiles = [];
        this.activeProfile = null;
        this.init();
    }

    detectDeviceName() {
        const ua = navigator.userAgent;
        if (/Macintosh|Mac OS X/.test(ua)) return 'Mac Studio / Desktop';
        if (/iPhone/.test(ua)) return 'iPhone Mobile';
        if (/iPad/.test(ua)) return 'iPad Tablet';
        if (/Android/.test(ua)) return 'Android Device';
        if (/Windows/.test(ua)) return 'Windows PC';
        if (/Linux/.test(ua)) return 'Linux Machine';
        return 'Personal Device';
    }

    init() {
        const stored = localStorage.getItem(this.PROFILES_KEY);
        if (stored) {
            try {
                this.profiles = JSON.parse(stored);
            } catch (e) {
                this.profiles = [];
            }
        }

        if (!this.profiles || this.profiles.length === 0) {
            // Seed initial primary device profile
            const defaultProf = {
                id: 'prof_local_primary',
                name: 'Personal Studio',
                device: this.detectDeviceName(),
                avatar: '💻',
                createdAt: Date.now()
            };
            this.profiles = [defaultProf];
            this.saveProfiles();
        }

        let activeId = localStorage.getItem(this.ACTIVE_ID_KEY);
        this.activeProfile = this.profiles.find(p => p.id === activeId) || this.profiles[0];
        localStorage.setItem(this.ACTIVE_ID_KEY, this.activeProfile.id);
    }

    saveProfiles() {
        localStorage.setItem(this.PROFILES_KEY, JSON.stringify(this.profiles));
    }

    getActiveProfile() {
        return this.activeProfile;
    }

    getActiveProfileId() {
        return this.activeProfile ? this.activeProfile.id : 'prof_local_primary';
    }

    getStorageKey(baseKey) {
        return `lossless_${this.getActiveProfileId()}_${baseKey}`;
    }

    getAllProfiles() {
        return this.profiles;
    }

    createProfile(name, avatar = '🎧') {
        const newProf = {
            id: 'prof_' + Math.random().toString(36).substring(2, 9),
            name: name.trim() || 'New Profile',
            device: this.detectDeviceName(),
            avatar: avatar,
            createdAt: Date.now()
        };
        this.profiles.push(newProf);
        this.saveProfiles();
        return newProf;
    }

    switchProfile(profileId) {
        const found = this.profiles.find(p => p.id === profileId);
        if (found) {
            this.activeProfile = found;
            localStorage.setItem(this.ACTIVE_ID_KEY, found.id);
            return true;
        }
        return false;
    }

    deleteProfile(profileId) {
        if (this.profiles.length <= 1) return false;
        this.profiles = this.profiles.filter(p => p.id !== profileId);
        if (this.activeProfile.id === profileId) {
            this.activeProfile = this.profiles[0];
            localStorage.setItem(this.ACTIVE_ID_KEY, this.activeProfile.id);
        }
        this.saveProfiles();
        return true;
    }

    getDeviceStorageStats() {
        let totalBytes = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const val = localStorage.getItem(key);
            totalBytes += (key.length + (val ? val.length : 0)) * 2;
        }
        const kb = (totalBytes / 1024).toFixed(1);
        return {
            totalEntries: localStorage.length,
            approxKB: kb,
            storageType: 'Local Machine Browser Storage (Persistent)'
        };
    }
}

window.ProfileManager = new DeviceProfileManager();
