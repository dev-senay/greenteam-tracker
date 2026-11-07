const TEXT = {
    en: {
        view_public: 'View without login',
        read_only: 'View only. Leaders log in to record waterings.',
        choose_group: 'Choose a group',
        saved_offline: 'No internet. Saved on this phone and will be sent automatically.',
        pending: 'waiting to be sent',
        synced: 'Sent from offline storage:',
        sync_failed: 'Rejected by the server:',
        log_watering: 'Log watering',
        back: 'Back',
        search_plant: 'Search plant or owner...',
        plant: 'Plant',
        watered_by: 'Watered by',
        health: 'Health',
        note: 'Note (optional)',
        photo: 'Photo (optional)',
        save: 'Save',
        saving: 'Saving...',
        saved: 'Saved ✓',
        choose_plant: 'Please choose a plant',
        title: 'GreenTeam Tracker',
        login: 'Log in',
        email: 'Email',
        password: 'Password',
        logout: 'Log out',
        total: 'Total plants',
        overdue: 'Overdue',
        critical: 'Critical',
        overdue_list: 'Plants that need water',
        all_plants: 'All plants',
        all_groups: 'All groups',
        all_status: 'All',
        owner: 'Owner',
        never: 'Never watered',
        days_ago: 'days ago',
        today: 'Today',
        healthy: 'Healthy',
        needs_attention: 'Needs attention',
        critical_status: 'Critical',
        nothing: 'Nothing here',
        loading: 'Loading...',
        network: 'Cannot reach the server'
    },
    am: {
        view_public: 'ያለ መግቢያ ተመልከት',
        read_only: 'ለመመልከት ብቻ ነው። መሪዎች ለመመዝገብ ይግቡ።',
        choose_group: 'ቡድን ይምረጡ',
        saved_offline: 'ኢንተርኔት የለም። በዚህ ስልክ ላይ ተቀምጧል፣ ሲመለስ በራሱ ይላካል።',
        pending: 'ለመላክ በመጠባበቅ ላይ',
        synced: 'ከጊዜያዊ ማከማቻ የተላኩ፦',
        sync_failed: 'በሰርቨር ውድቅ የተደረጉ፦',
        log_watering: 'ውሃ ማጠጣት መዝግብ',
        back: 'ተመለስ',
        search_plant: 'ተክል ወይም ባለቤት ፈልግ...',
        plant: 'ተክል',
        watered_by: 'ያጠጣው',
        health: 'ጤና',
        note: 'ማስታወሻ (አማራጭ)',
        photo: 'ፎቶ (አማራጭ)',
        save: 'አስቀምጥ',
        saving: 'በማስቀመጥ ላይ...',
        saved: 'ተቀምጧል ✓',
        choose_plant: 'እባክዎ ተክል ይምረጡ',
        title: 'ግሪንቲም መከታተያ',
        login: 'ግባ',
        email: 'ኢሜይል',
        password: 'የይለፍ ቃል',
        logout: 'ውጣ',
        total: 'ጠቅላላ ዕፅዋት',
        overdue: 'የዘገዩ',
        critical: 'አደገኛ',
        overdue_list: 'ውሃ የሚያስፈልጋቸው ዕፅዋት',
        all_plants: 'ሁሉም ዕፅዋት',
        all_groups: 'ሁሉም ቡድኖች',
        all_status: 'ሁሉም',
        owner: 'ባለቤት',
        never: 'ገና አልተጠጣም',
        days_ago: 'ቀን በፊት',
        today: 'ዛሬ',
        healthy: 'ጤናማ',
        needs_attention: 'ትኩረት ይፈልጋል',
        critical_status: 'አደገኛ',
        nothing: 'ምንም የለም',
        loading: 'በመጫን ላይ...',
        network: 'ከሰርቨሩ ጋር መገናኘት አልተቻለም'
    }
};

export function getLang() {
    return localStorage.getItem('lang') || 'en';
}

export function t(key) {
    return TEXT[getLang()][key] || key;
}

export function applyI18n() {
    document.documentElement.lang = getLang();
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
}

// connects a button with id="langBtn"; calls onChange after switching
export function setupLangButton(onChange) {
    const btn = document.getElementById('langBtn');
    btn.textContent = getLang() === 'en' ? 'አማ' : 'EN';
    btn.onclick = () => {
        localStorage.setItem('lang', getLang() === 'en' ? 'am' : 'en');
        btn.textContent = getLang() === 'en' ? 'አማ' : 'EN';
        applyI18n();
        if (onChange) onChange();
    };
}