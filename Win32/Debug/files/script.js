/* =========================================
   GENEL DEĞİŞKENLER
   ========================================= */
window.currentCaptcha = '';

/* =========================================
   CAPTCHA SİSTEMİ
   ========================================= */
window.generateCaptcha = function () {
    const display = document.getElementById('captchaDisplay');
    // Eğer element henüz yoksa hata verme, sessizce çık
    if (!display) return '';

    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let captchaCode = '';
    for (let i = 0; i < 6; i++) {
        captchaCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    display.innerText = captchaCode;
    window.currentCaptcha = captchaCode;
    return captchaCode;
};

/* =========================================
   DİNAMİK YÜKSEKLİK HESAPLAMA
   ========================================= */
window.updateCardHeight = function () {
    const card = document.getElementById('loginCard');
    if (!card) return; // Element yoksa çık

    const isFlipped = card.classList.contains('flipped');
    const activeFace = isFlipped ? document.getElementById('faceBack') : document.getElementById('faceFront');

    if (activeFace) {
        card.style.height = activeFace.offsetHeight + 'px';
    }
};

/* =========================================
   KART DÖNDÜRME VE ANİMASYONLAR
   ========================================= */
window.rotateCard = function (toRegister) {
    const card = document.getElementById('loginCard');
    const cntFront = document.getElementById('cntFront');
    const cntBack = document.getElementById('cntBack');

    if (toRegister) {
        card.classList.add('flipped');
        cntFront.classList.remove('active-content');
        window.updateCardHeight();
        setTimeout(() => cntBack.classList.add('active-content'), 150);
    } else {
        card.classList.remove('flipped');
        cntBack.classList.remove('active-content');
        window.updateCardHeight();
        setTimeout(() => cntFront.classList.add('active-content'), 150);
    }
};

window.togglePassword = function (inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + '_icon');
    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    } else {
        input.type = "password";
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    }
};

/* =========================================
   IPOSI CUSTOM POPUP FONKSİYONLARI
   ========================================= */
window.iposiAlert = function (title, message, type = 'error') {
    const overlay = document.getElementById('iposiPopup');
    const iconContainer = document.getElementById('iposiPopupIcon');
    const titleEl = document.getElementById('iposiPopupTitle');
    const messageEl = document.getElementById('iposiPopupMessage');
    const btnEl = document.getElementById('iposiPopupBtn');

    if (!overlay) return;

    iconContainer.className = 'iposi-popup-icon ' + type;
    btnEl.className = 'iposi-popup-btn ' + type;

    if (type === 'error') {
        iconContainer.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    } else if (type === 'success') {
        iconContainer.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else if (type === 'warning') {
        iconContainer.innerHTML = '<i class="fa-solid fa-exclamation"></i>';
    }

    titleEl.innerText = title;
    messageEl.innerText = message;
    overlay.classList.add('active');
};

window.closeIposiPopup = function () {
    document.getElementById('iposiPopup').classList.remove('active');
};

window.handleForgot = function () {
    document.getElementById('pwdResetModal').classList.add('active');
};

window.closePwdModal = function () {
    document.getElementById('pwdResetModal').classList.remove('active');
};

/* =========================================
   GİRİŞ / KAYIT KONTROLLERİ
   ========================================= */
window.submitAuth = function (type) {
    const btnId = type === 'login' ? 'l_submit' : 'r_submit';
    const btn = document.getElementById(btnId);

    if (btn) {
        btn.classList.add('shake');
        setTimeout(() => btn.classList.remove('shake'), 500);
    }

    if (type === 'register') {
        const pass1 = document.getElementById('r_pass').value;
        const pass2 = document.getElementById('r_pass2').value;
        const inputCaptcha = document.getElementById('r_captcha').value.toUpperCase();

        if (pass1 === '' || pass2 === '') {
            window.iposiAlert('Missing Information', 'Please do not leave password fields empty.', 'warning');
            return;
        }

        if (pass1 !== pass2) {
            window.iposiAlert('Password Missmatch', 'The passwords you entered do not match. Please check and try again.', 'error');
            return;
        }

        if (inputCaptcha !== window.currentCaptcha) {
            window.iposiAlert('Invalid Captcha', 'You entered the security code incorrectly. Please try again.', 'error');
            window.generateCaptcha(); // Hatalı girişte otomatik yenile
            document.getElementById('r_captcha').value = '';
            return;
        }

        // Başarılıysa Delphi'ye gönder
        ajaxRequest(LOGIN_FORM.LoginHTML, 'AuthRegister', [
            'user=' + document.getElementById('r_user').value,
            'email=' + document.getElementById('r_email').value,
            'pass=' + pass1
        ]);
    }

    if (type === 'login') {
        const user = document.getElementById('l_user').value;
        const pass = document.getElementById('l_pass').value;
        const remember = document.getElementById('chkRemember').checked ? '1' : '0';

        if (user === '' || pass === '') {
            window.iposiAlert('Missing Information', 'You must enter a username and password to proceed login.', 'warning');
            return;
        }

        // Başarılıysa Delphi'ye gönder
        ajaxRequest(LOGIN_FORM.LoginHTML, 'AuthLogin', [
            'user=' + user,
            'pass=' + pass,
            'remember=' + remember
        ]);
    }
};

window.handleKey = function (event, type) {
    if (event.key === 'Enter') {
        window.submitAuth(type);
    }
};

/* =========================================
   UNIGUI İÇİN GÜVENLİ BAŞLATICI
   ========================================= */
window.initIposi = function () {
    const display = document.getElementById('captchaDisplay');
    const card = document.getElementById('loginCard');

    // UniGUI HTML'i henüz DOM'a basmadıysa 50ms sonra tekrar dene
    if (!display || !card) {
        setTimeout(window.initIposi, 50);
        return;
    }

    // HTML başarıyla yüklendiyse ilk kurulumu yap
    if (window.currentCaptcha === '') {
        window.generateCaptcha();
    }
    window.updateCardHeight();
};

// Başlatıcıyı tetikle
window.initIposi();

// ==========================================
// IPOSI WORKSPACE ETKİLEŞİMLERİ (GLOBAL SCOPE)
// ==========================================

// Sekme (Tab) Değiştirme Fonksiyonu
window.switchTab = function (group, tabName, event) {
    // 1. Tıklanan sekmenin bulunduğu kapsayıcıyı (panel-tabs) bul ve sadece onun içindeki active'leri temizle
    const tabContainer = event.currentTarget.parentElement;
    const tabs = tabContainer.querySelectorAll('.panel-tab');
    tabs.forEach(t => t.classList.remove('active'));

    // 2. İlgili gruba ait (req- veya res-) tüm panelleri gizle
    const panes = document.querySelectorAll(`[id^="${group}-"]`);
    panes.forEach(p => p.classList.remove('active'));

    // 3. Tıklanan sekmeyi ve paneli aktif et
    event.currentTarget.classList.add('active');
    const targetPane = document.getElementById(`${group}-${tabName}`);
    if (targetPane) {
        targetPane.classList.add('active');
    }

    // 4. KRİTİK ÇÖZÜM: Eğer açılan sekme "Body" ise CodeMirror'ı yenile
    // CodeMirror gizli sekmedeyken boyut hesaplayamaz, görünür olduğunda refresh edilmelidir.
    if (tabName === 'body') {
        setTimeout(function () {
            if (group === 'req' && window.reqEditor) window.reqEditor.refresh();
            if (group === 'res' && window.resEditor) window.resEditor.refresh();
        }, 10); // Sekme animasyonunun bitmesi için 10ms tolerans
    }
};

// Sol Sidebar Değiştirme (History / Collections)
window.switchSidebar = function (tabName) {
    const tabs = document.querySelectorAll('.sidebar-tab');
    tabs.forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');
};

// ==========================================
// CUSTOM METHOD DROPDOWN İŞLEMLERİ
// ==========================================
window.toggleMethodDropdown = function (e) {
    const dropdown = document.getElementById('methodDropdown');
    dropdown.classList.toggle('show');
    e.stopPropagation(); // Sayfaya tıklanınca kapanması için
};

window.selectMethod = function (methodName) {
    const selectedEl = document.getElementById('selectedMethod');
    selectedEl.innerText = methodName;

    // Rengi metodun ismine göre güncelle
    selectedEl.className = 'method-' + methodName.toLowerCase();
    window.saveCurrentTabState();

    // Tabları yeniden çiz
    window.renderApiTabs();
};

// Menü harici bir yere tıklanınca Dropdown'ı kapat
document.addEventListener('click', function (event) {
    const dropdown = document.getElementById('methodDropdown');
    if (dropdown && dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
    }
});

// ==========================================
// İSTEK VE YANIT İŞLEMLERİ
// ==========================================
window.sendAPIRequest = function () {
    const method = document.getElementById('selectedMethod').innerText;
    const url = document.getElementById('reqUrl').value;

    // Veriyi textarea'dan değil CodeMirror'dan alıyoruz!
    const bodyStr = window.reqEditor ? window.reqEditor.getValue() : '';

    if (!url) {
        if (window.iposiAlert) window.iposiAlert('Warning', 'Please enter a URL.', 'warning');
        return;
    }

    // ==========================================
    // HEADERS IZGARASINI JSON'A ÇEVİRME
    // ==========================================
    const headerRows = document.querySelectorAll('#headersList .kv-row');
    let reqHeaders = [];
    headerRows.forEach(row => {
        const k = row.querySelector('.kv-key').value.trim();
        const v = row.querySelector('.kv-val').value.trim();
        if (k) { // Sadece Anahtar (Key) kısmı dolu olanları alıyoruz
            reqHeaders.push({ key: k, value: v });
        }
    });
    const headersJson = JSON.stringify(reqHeaders);

    // Yükleniyor durumuna al
    if (window.resEditor) {
        window.resEditor.setValue("// Sending request...\n// Please wait.");
    }

    const statusEl = document.getElementById('resStatus');
    statusEl.innerText = "SENDING...";
    statusEl.className = "status-badge status-warn";

    document.getElementById('resTime').innerText = "...";
    document.getElementById('resSize').innerText = "...";

    // Delphi tarafına ajaxRequest (headers parametresi eklendi)
    ajaxRequest(MainForm.MainHTML, 'ExecuteAPI', [
        'method=' + method,
        'url=' + encodeURIComponent(url),
        'body=' + encodeURIComponent(bodyStr),
        'headers=' + encodeURIComponent(headersJson)
    ]);
};

window.updateResponse = function (statusCode, statusText, timeStr, sizeStr, responseBody) {
    const statusEl = document.getElementById('resStatus');
    const fullStatus = statusCode + " " + statusText;

    statusEl.innerText = fullStatus;
    document.getElementById('resTime').innerText = timeStr;
    document.getElementById('resSize').innerText = sizeStr;

    // ==========================================
    // JSON FORMATLAMA (BEAUTIFY) İŞLEMİ
    // ==========================================
    let finalBody = responseBody;
    try {
        // Eğer yanıt geçerli bir JSON ise, 2 boşluk bırakarak hiyerarşik formatla
        const parsedJson = JSON.parse(responseBody);
        finalBody = JSON.stringify(parsedJson, null, 2);
    } catch (e) {
        // Yanıt JSON değilse (Örn: 404 HTML hata sayfası veya düz metin), olduğu gibi bırak
    }

    // Formatlanmış veriyi CodeMirror'a basıyoruz
    if (window.resEditor) {
        window.resEditor.setValue(finalBody);
        // Olası boyut kaymalarını önlemek için ufak bir yenileme tetikliyoruz
        setTimeout(() => window.resEditor.refresh(), 10);
    }


    // Badgenin Rengini Belirle
    const code = parseInt(statusCode);
    if (code >= 200 && code < 300) {
        statusEl.className = "status-badge status-ok";
    } else if (code >= 400) {
        statusEl.className = "status-badge status-err";
    } else if (code >= 300 && code < 400) {
        statusEl.className = "status-badge status-warn";
    } else {
        statusEl.className = "status-badge status-default";
    }
};

// ==========================================
// KULLANICI İŞLEMLERİ
// ==========================================
window.logoutUser = function () {
    // Çıkış yaparken ufak bir onay veya direkt çıkış işlemi
    // Delphi tarafında bu isteği yakalayıp Cookie'yi silecek ve MainForm'u kapatacağız
    ajaxRequest(MainForm.MainHTML, 'AuthLogout', []);
};

// İleride Delphi'den kullanıcı adını dinamik olarak basmak için bir fonksiyon
window.setWorkspaceUser = function (username) {
    const userEl = document.getElementById('loggedInUser');
    if (userEl) userEl.innerText = username;
};

// ==========================================
// UI / UX GÜNCELLEMELERİ (URL DEĞİŞTİKÇE TAB TİTLE DEĞİŞSİN)
// ==========================================
// Arayüzde URL değiştikçe hafızaya kaydet ve tab ismini güncelle
document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'reqUrl') {
        window.saveCurrentTabState(); // Değişikliği anında diziye yaz
        window.renderApiTabs(); // Tab başlığını anında güncelle
    }
});

// ==========================================
// GLOBAL DEĞİŞKENLER (EDİTÖRLER İÇİN)
// ==========================================
window.reqEditor = null;
window.resEditor = null;

// ==========================================
// DİNAMİK KÜTÜPHANE YÜKLEYİCİ (GARANTİLİ ÇÖZÜM)
// ==========================================
window.loadCodeMirror = function (callback) {
    if (typeof CodeMirror !== 'undefined') {
        callback();
        return;
    }

    console.log("CodeMirror CDN'den dinamik olarak indiriliyor...");

    const css1 = document.createElement('link');
    css1.rel = 'stylesheet';
    css1.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/codemirror.min.css';
    document.head.appendChild(css1);

    const css2 = document.createElement('link');
    css2.rel = 'stylesheet';
    css2.href = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/theme/monokai.min.css';
    document.head.appendChild(css2);

    const js1 = document.createElement('script');
    js1.src = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/codemirror.min.js';
    js1.onload = function () {
        // Çeşitli Raw modüllerini arka arkaya indiriyoruz
        const modules = [
            'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/mode/javascript/javascript.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/mode/xml/xml.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/mode/htmlmixed/htmlmixed.min.js'
        ];

        let loaded = 0;
        modules.forEach(src => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                loaded++;
                if (loaded === modules.length) callback(); // Hepsi inince başlat
            };
            document.head.appendChild(script);
        });
    };
    document.head.appendChild(js1);
};

// ==========================================
// SİSTEM BAŞLATICI (CodeMirror Kurulumu)
// ==========================================
window.initWorkspace = function () {
    const reqTextarea = document.getElementById('reqBodyContent');
    const resTextarea = document.getElementById('resBodyContent');

    // Elementler DOM'a basıldı mı kontrol et
    if (!reqTextarea || !resTextarea) {
        setTimeout(window.initWorkspace, 100);
        return;
    }

    // Editörleri Başlat
    try {
        if (!window.reqEditor) {
            window.reqEditor = CodeMirror.fromTextArea(reqTextarea, {
                mode: "application/json",
                theme: "monokai",
                lineNumbers: true,
                matchBrackets: true,
                autoCloseBrackets: true
            });
            window.reqEditor.setValue('{\n  \n}');
        }

        if (!window.resEditor) {
            window.resEditor = CodeMirror.fromTextArea(resTextarea, {
                mode: "application/json",
                theme: "monokai",
                lineNumbers: true,
                readOnly: true
            });
        }
    } catch (e) {
        console.error("CodeMirror başlatma hatası:", e);
    }

    if (window.apiTabs.length === 0) {
        window.addNewApiTab();
    }

    setTimeout(() => {
        if (window.checkEmptyState) {
            window.checkEmptyState('params');
            window.checkEmptyState('headers');
        }
    }, 100);
};

// ==========================================
// BAŞLATMAYI TETİKLE
// ==========================================
// Önce kütüphaneyi indir, iner inmez Workspace'i kur!
window.loadCodeMirror(function () {
    // UniGUI gecikmeleri için ufak bir pay
    setTimeout(window.initWorkspace, 200);
});

// ==========================================
// DİNAMİK API SEKMELERİ (TAB) YÖNETİMİ
// ==========================================

// Sekmelerin verilerini tutacağımız dizi
window.apiTabs = [];
window.activeTabId = null;
window.tabCounter = 0;

// Yeni Sekme Oluştur
window.addNewApiTab = function () {
    window.tabCounter++;
    const newTabId = 'tab_' + window.tabCounter;

    const newTab = {
        id: newTabId,
        customName: '',
        method: 'GET',
        url: '',
        bodyType: 'raw',
        rawType: 'application/json',
        reqBody: '{\n  "key": "value"\n}',
        reqParams: [], // Params hafızası eklendi
        reqHeaders: [], // Headers hafızası eklendi
        reqUrlencoded: [], // Form hafızası eklendi
        resBody: '',
        resStatus: '000 WAITING',
        resStatusClass: 'status-badge status-default',
        resTime: '0 ms',
        resSize: '0 B'
    };

    window.apiTabs.push(newTab);
    window.switchApiTab(newTabId);
};


window.renderApiTabs = function () {
    const container = document.getElementById('apiTabContainer');
    if (!container) return;

    container.innerHTML = '';

    window.apiTabs.forEach(tab => {
        const isActive = (tab.id === window.activeTabId) ? 'active' : '';
        const displayTitle = tab.customName ? tab.customName : (tab.url ? tab.url : 'Untitled Request');

        // draggable="true" ve sürükleme eventleri eklendi
        const tabHtml = `
            <div class="req-tab ${isActive}" 
                 draggable="true"
                 ondragstart="window.onTabDragStart(event, '${tab.id}')"
                 ondragover="window.onTabDragOver(event)"
                 ondragenter="window.onTabDragEnter(event)"
                 ondragleave="window.onTabDragLeave(event)"
                 ondrop="window.onTabDrop(event, '${tab.id}')"
                 ondragend="window.onTabDragEnd(event)"
                 onclick="window.switchApiTab('${tab.id}')" 
                 ondblclick="window.renameApiTab(event, '${tab.id}')" 
                 title="Yeniden adlandırmak için çift tıklayın">
                <span class="method-${tab.method.toLowerCase()}" style="font-weight:bold; font-size: 0.75rem;">${tab.method}</span>
                <span id="title_${tab.id}" style="max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; outline: none; padding: 0 4px;">${displayTitle}</span>
                
                <svg class="req-tab-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" onclick="window.closeApiTab(event, '${tab.id}')">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', tabHtml);
    });
};

window.switchApiTab = function (tabId) {
    window.saveCurrentTabState(); // Eski sekmenin verilerini sağlama al

    window.activeTabId = tabId;

    const tab = window.apiTabs.find(t => t.id === tabId);
    if (tab) {
        window.selectMethod(tab.method, true); // True ile üzerine yazma hatasını önlüyoruz
        document.getElementById('reqUrl').value = tab.url;

        // Body Seçeneklerini Geri Yükle
        const bodyRadio = document.querySelector(`input[name="bodyType"][value="${tab.bodyType}"]`);
        if (bodyRadio) bodyRadio.checked = true;
        window.changeBodyType(tab.bodyType);

        const rawDropdown = document.getElementById('rawTypeDropdown');
        if (rawDropdown) rawDropdown.value = tab.rawType;
        window.changeRawType(tab.rawType, true); // Şablon basımını engellemek için true

        if (window.reqEditor) window.reqEditor.setValue(tab.reqBody);
        if (window.resEditor) window.resEditor.setValue(tab.resBody);

        // Gridlerdeki verileri geri yükle
        window.restoreKvData('params', tab.reqParams);
        window.restoreKvData('headers', tab.reqHeaders);
        window.restoreKvData('urlencoded', tab.reqUrlencoded);

        const statusEl = document.getElementById('resStatus');
        statusEl.innerText = tab.resStatus;
        statusEl.className = tab.resStatusClass;
        document.getElementById('resTime').innerText = tab.resTime;
        document.getElementById('resSize').innerText = tab.resSize;
    }

    window.renderApiTabs();
};

// ==========================================
// YENİ: SEKME İSMİNİ İÇERİDEN DEĞİŞTİRME
// ==========================================
window.renameApiTab = function (event, tabId) {
    event.stopPropagation();

    const tab = window.apiTabs.find(t => t.id === tabId);
    if (!tab) return;

    const titleSpan = document.getElementById('title_' + tabId);
    if (!titleSpan) return;

    const currentText = tab.customName ? tab.customName : (tab.url ? tab.url : 'Untitled Request');

    // Gerçek bir input oluşturuyoruz ki UniGUI silme/yazma tuşlarını yutmasın
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.className = 'tab-rename-input';

    titleSpan.replaceWith(input);
    input.focus();
    input.select();

    input.onkeydown = function (e) {
        e.stopPropagation(); // UniGUI klavye olaylarını engelle
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            input.value = currentText; // İptal edilirse eski yazıyı geri getir
            input.blur();
        }
    };

    input.onblur = function () {
        const newName = input.value.trim();
        tab.customName = newName;
        window.renderApiTabs(); // Yeniden span formuna çevirip çizer
    };
};

window.sendAPIRequest = function () {
    const method = document.getElementById('selectedMethod').innerText;
    const url = document.getElementById('reqUrl').value;
    const bodyStr = window.reqEditor ? window.reqEditor.getValue() : '';

    if (!url) {
        if (window.iposiAlert) window.iposiAlert('Warning', 'Please enter an URL.', 'warning');
        return;
    }

    // ==========================================
    // HISTORY İÇİN TÜM VERİLERİ TOPLAMA
    // ==========================================
    const checkedBody = document.querySelector('input[name="bodyType"]:checked');
    const bodyType = checkedBody ? checkedBody.value : 'none';

    const rawDropdown = document.getElementById('rawTypeDropdown');
    const rawType = rawDropdown ? rawDropdown.value : 'application/json';

    // Grid verilerini JSON formatında hazırlıyoruz
    const paramsData = window.getKvData('params');
    const headersData = window.getKvData('headers');
    const urlencodedData = window.getKvData('urlencoded');

    const activeTab = window.apiTabs.find(t => t.id === window.activeTabId);
    const tabName = (activeTab && activeTab.customName) ? activeTab.customName : '';

    const chkSave = document.getElementById('chkSaveHistory');
    const saveHistory = (chkSave && chkSave.checked) ? '1' : '0';

    // Yükleniyor durumuna al
    if (window.resEditor) {
        window.resEditor.setValue("// İstek gönderiliyor...\n// Lütfen bekleyiniz.");
    }

    const statusEl = document.getElementById('resStatus');
    statusEl.innerText = "SENDING...";
    statusEl.className = "status-badge status-warn";

    document.getElementById('resTime').innerText = "...";
    document.getElementById('resSize').innerText = "...";

    // Delphi tarafına ajaxRequest (Parametreler genişletildi)
    ajaxRequest(MainForm.MainHTML, 'ExecuteAPI', [
        'method=' + method,
        'url=' + encodeURIComponent(url),
        'tab_name=' + encodeURIComponent(tabName),
        'save_history=' + saveHistory,
        'body_type=' + bodyType,
        'raw_type=' + rawType,
        'body=' + encodeURIComponent(bodyStr),
        'params=' + encodeURIComponent(JSON.stringify(paramsData)),
        'headers=' + encodeURIComponent(JSON.stringify(headersData)),
        'urlencoded=' + encodeURIComponent(JSON.stringify(urlencodedData))
    ]);
};

// Mevcut Ekrandaki Verileri Aktif Sekmeye Kaydetme
window.saveCurrentTabState = function () {
    if (!window.activeTabId) return;

    const tab = window.apiTabs.find(t => t.id === window.activeTabId);
    if (tab) {
        tab.method = document.getElementById('selectedMethod').innerText;
        tab.url = document.getElementById('reqUrl').value;

        const checkedBody = document.querySelector('input[name="bodyType"]:checked');
        if (checkedBody) tab.bodyType = checkedBody.value;

        const rawDropdown = document.getElementById('rawTypeDropdown');
        if (rawDropdown) tab.rawType = rawDropdown.value;

        if (window.reqEditor) tab.reqBody = window.reqEditor.getValue();
        if (window.resEditor) tab.resBody = window.resEditor.getValue();

        // Gridlerdeki verileri array olarak toplayıp hafızaya atıyoruz
        tab.reqParams = window.getKvData('params');
        tab.reqHeaders = window.getKvData('headers');
        tab.reqUrlencoded = window.getKvData('urlencoded');

        const statusEl = document.getElementById('resStatus');
        tab.resStatus = statusEl.innerText;
        tab.resStatusClass = statusEl.className;
        tab.resTime = document.getElementById('resTime').innerText;
        tab.resSize = document.getElementById('resSize').innerText;
    }
};

// Sekme Kapatma
window.closeApiTab = function (event, tabId) {
    event.stopPropagation(); // Sekmeye tıklama (switch) olayını engelle

    if (window.apiTabs.length === 1) {
        if (window.iposiAlert) window.iposiAlert('Warning', 'You cannot close the last tab.', 'warning'); return;
    }

    // Sekmeyi diziden sil
    window.apiTabs = window.apiTabs.filter(t => t.id !== tabId);

    // Eğer kapatılan sekme aktif sekme ise, bir öncekine geç
    if (window.activeTabId === tabId) {
        const lastTab = window.apiTabs[window.apiTabs.length - 1];
        window.switchApiTab(lastTab.id);
    } else {
        window.renderApiTabs();
    }
};

// ==========================================
// PANELLERİ YENİDEN BOYUTLANDIRMA (RESIZER)
// ==========================================
window.initResizer = function () {
    const resizer = document.getElementById('apiResizer');
    const reqPanel = document.getElementById('reqPanelWrap');
    const workspaceBody = document.querySelector('.workspace-body');

    if (!resizer || !reqPanel || !workspaceBody) return;

    let startY = 0;
    let startHeight = 0;

    resizer.addEventListener('mousedown', function (e) {
        startY = e.clientY;
        startHeight = reqPanel.getBoundingClientRect().height;

        // Dinleyicileri tüm dökümana ekliyoruz ki fareyi hızlı çekince takılmasın
        document.addEventListener('mousemove', doDrag, false);
        document.addEventListener('mouseup', stopDrag, false);

        resizer.classList.add('dragging');
        // Sürükleme esnasında metin seçimini kapat (mavi mavi yazılar seçilmesin)
        document.body.style.userSelect = 'none';
    });

    function doDrag(e) {
        const newHeight = startHeight + (e.clientY - startY);
        // Panellerin tamamen kapanmasını engellemek için min 100px sınır koyuyoruz
        if (newHeight > 100 && newHeight < workspaceBody.clientHeight - 100) {
            reqPanel.style.flex = 'none'; // Flex davranışını ezip mutlak piksel atıyoruz
            reqPanel.style.height = newHeight + 'px';

            // Boyut değişirken CodeMirror anında kendini uyarlasın (Scrollbar hatasını engeller)
            if (window.reqEditor) window.reqEditor.refresh();
            if (window.resEditor) window.resEditor.refresh();
        }
    }

    function stopDrag() {
        document.removeEventListener('mousemove', doDrag, false);
        document.removeEventListener('mouseup', stopDrag, false);
        resizer.classList.remove('dragging');
        document.body.style.userSelect = '';

        // Sürükleme bittiğinde son bir kalibrasyon
        if (window.reqEditor) window.reqEditor.refresh();
        if (window.resEditor) window.resEditor.refresh();
    }
};

// Sayfa (veya bileşen) tamamen yüklendikten sonra Resizer'ı aktif et
setTimeout(window.initResizer, 500);

// ==========================================
// CUSTOM METHOD DROPDOWN İŞLEMLERİ (ANİMASYONLU)
// ==========================================
window.toggleMethodDropdown = function (e) {
    const dropdown = document.getElementById('methodDropdown');
    const box = e.currentTarget;

    dropdown.classList.toggle('show');
    box.classList.toggle('open'); // Oku döndürmek için 'open' sınıfını tetikliyoruz
    e.stopPropagation(); // Sayfaya tıklanınca kapanması için
};

window.selectMethod = function (methodName, preventSave = false) {
    const selectedEl = document.getElementById('selectedMethod');
    selectedEl.innerText = methodName;
    selectedEl.className = 'method-' + methodName.toLowerCase();

    if (!preventSave) {
        window.saveCurrentTabState();
        window.renderApiTabs();
    }
};

// Menü harici bir yere tıklanınca Dropdown'ı kapat ve oku eski haline getir
document.addEventListener('click', function (event) {
    const dropdown = document.getElementById('methodDropdown');
    const box = document.querySelector('.custom-method-box');

    if (dropdown && dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        if (box) box.classList.remove('open');
    }
});

// ==========================================
// KEY-VALUE GRID (PARAMS & HEADERS) YÖNETİMİ
// ==========================================

// Yeni Satır Ekle
window.addKvRow = function (type, key = '', value = '') {
    const container = document.getElementById(type + 'List');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'kv-row';

    // Sil butonuna tıklandığında checkEmptyState fonksiyonunu da tetikliyoruz
    row.innerHTML = `
        <input type="text" class="kv-input kv-key" placeholder="Key" value="${key}" oninput="window.handleKvInput('${type}')">
        <input type="text" class="kv-input kv-val" placeholder="Value" value="${value}" oninput="window.handleKvInput('${type}')">
        <button class="kv-del-btn" onclick="this.parentElement.remove(); window.handleKvInput('${type}'); window.checkEmptyState('${type}');" title="Delete">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;
    container.appendChild(row);

    // Bir satır eklendiği için boş uyarısını tekrar kontrol et (gizle)
    window.checkEmptyState(type);
};

// Inputlara Yazıldıkça veya Silindikçe Tetiklenir
window.handleKvInput = function (type) {
    if (type === 'params') {
        window.updateUrlFromParams();
    }
    window.saveCurrentTabState();
};

// Params Gridini URL'ye Aktar
window.updateUrlFromParams = function () {
    const urlInput = document.getElementById('reqUrl');
    let baseUrl = urlInput.value.split('?')[0]; // URL'nin ? işaretinden önceki kök kısmını al

    const rows = document.querySelectorAll('#paramsList .kv-row');
    let queryParts = [];

    rows.forEach(row => {
        const k = row.querySelector('.kv-key').value.trim();
        const v = row.querySelector('.kv-val').value.trim();
        if (k) { // Sadece Key kısmı doluysa URL'ye ekle
            queryParts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
        }
    });

    if (queryParts.length > 0) {
        urlInput.value = baseUrl + '?' + queryParts.join('&');
    } else {
        urlInput.value = baseUrl;
    }

    // Tab başlığını da güncellemek için
    window.renderApiTabs();
};

window.checkEmptyState = function (type) {
    const list = document.getElementById(type + 'List');
    const emptyText = document.getElementById(type + 'Empty');

    if (!list || !emptyText) return;

    // İçerideki satır (kv-row) sayısını hesapla
    const rowCount = list.querySelectorAll('.kv-row').length;

    // Eğer satır yoksa uyarıyı göster, varsa gizle
    if (rowCount === 0) {
        emptyText.style.display = 'block';
    } else {
        emptyText.style.display = 'none';
    }
};

// ==========================================
// BODY TYPE DEĞİŞTİRME MANTIĞI
// ==========================================
window.changeBodyType = function (type) {
    document.getElementById('body-none').style.display = (type === 'none') ? 'block' : 'none';
    document.getElementById('body-urlencoded').style.display = (type === 'urlencoded') ? 'block' : 'none';
    document.getElementById('body-raw').style.display = (type === 'raw') ? 'flex' : 'none';

    const dropdown = document.getElementById('rawTypeDropdown');
    dropdown.style.display = (type === 'raw') ? 'block' : 'none';

    // Raw seçildiyse CodeMirror boyut hatasını düzeltmek için refresh tetikle
    if (type === 'raw' && window.reqEditor) {
        setTimeout(() => window.reqEditor.refresh(), 10);
    }
};

window.changeRawType = function (mode, preventTemplate = false) {
    if (!window.reqEditor) return;
    window.reqEditor.setOption("mode", mode);

    // Sekme değişirken boş yere yeni şablon basılmasını engeller
    if (preventTemplate) return;

    const currentVal = window.reqEditor.getValue().trim();
    const boilerplates = {
        "application/json": '{\n  "key": "value"\n}',
        "text/html": '<!DOCTYPE html>\n<html>\n<head>\n  <title>Iposi Test</title>\n</head>\n<body>\n  \n</body>\n</html>',
        "application/xml": '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  \n</root>',
        "text/javascript": 'function testApi() {\n  console.log("Hello Iposi!");\n}',
        "text/plain": ''
    };

    if (currentVal === '' || currentVal === '{\n  \n}' || currentVal === '{}') {
        window.reqEditor.setValue(boilerplates[mode] || '');
    }
};

window.beautifyRawBody = function () {
    if (!window.reqEditor) return;

    const mode = window.reqEditor.getOption("mode");
    const val = window.reqEditor.getValue();

    // Şu an için sadece JSON desteği veriyoruz, çünkü diğer diller (HTML/XML) devasa parser kütüphaneleri gerektiriyor
    if (mode === "application/json") {
        try {
            if (val.trim() === '') return; // Boşsa uyarı verme, direkt çık

            const parsedJson = JSON.parse(val);
            const beautified = JSON.stringify(parsedJson, null, 2);
            window.reqEditor.setValue(beautified);

            // Eğer istersen başarılı popup'ı gösterebilirsin
            // if(window.iposiAlert) window.iposiAlert('Başarılı', 'JSON başarıyla formatlandı!', 'success');

        } catch (e) {
            if (window.iposiAlert) {
                window.iposiAlert('Format Error', 'The text you entered is not a valid JSON. Please check for syntax errors (missing commas, quotes, etc.).', 'error');
            }
        }
    } else {
        if (window.iposiAlert) {
            window.iposiAlert('Information', 'The auto-format (Beautify) feature is currently only supported for JSON format.', 'warning');
        }
    }
};

window.getKvData = function (type) {
    const rows = document.querySelectorAll('#' + type + 'List .kv-row');
    let data = [];
    rows.forEach(row => {
        const keyVal = row.querySelector('.kv-key').value.trim();
        const valVal = row.querySelector('.kv-val').value.trim();
        if (keyVal) {
            data.push({
                key: keyVal,
                value: valVal
            });
        }
    });
    return data;
};

window.restoreKvData = function (type, dataArray) {
    const container = document.getElementById(type + 'List');
    if (!container) return;

    // Empty state mesajını kaybetmeden içindeki satırları (kv-row) sil
    const emptyState = document.getElementById(type + 'Empty');
    container.innerHTML = '';
    if (emptyState) container.appendChild(emptyState);

    // Hafızadaki verileri geri bas
    if (dataArray && dataArray.length > 0) {
        dataArray.forEach(item => window.addKvRow(type, item.k, item.v));
    }
    window.checkEmptyState(type);
};

// ==========================================
// DRAG & DROP (SÜRÜKLE BIRAK) MANTIĞI
// ==========================================
window.draggedTabId = null;

window.onTabDragStart = function (e, tabId) {
    window.draggedTabId = tabId;
    e.dataTransfer.effectAllowed = 'move';
    // Görsel değişimi anında yansıtması için ufak bir gecikme
    setTimeout(() => {
        if (e.target.classList) e.target.classList.add('dragging');
    }, 0);
};

window.onTabDragOver = function (e) {
    e.preventDefault(); // Bırakmaya (drop) izin ver
    e.dataTransfer.dropEffect = 'move';
};

window.onTabDragEnter = function (e) {
    e.preventDefault();
    const tabEl = e.target.closest('.req-tab');
    // Eğer üzerine geldiğimiz sekme sürüklediğimiz sekme değilse mavi çerçeveye al
    if (tabEl && window.draggedTabId && tabEl.id !== 'tab_' + window.draggedTabId) {
        tabEl.classList.add('drag-over');
    }
};

window.onTabDragLeave = function (e) {
    const tabEl = e.target.closest('.req-tab');
    if (tabEl) tabEl.classList.remove('drag-over');
};

window.onTabDrop = function (e, targetTabId) {
    e.preventDefault();
    const tabEl = e.target.closest('.req-tab');
    if (tabEl) tabEl.classList.remove('drag-over');

    // Eğer farklı bir sekmenin üstüne bırakıldıysa dizideki yerlerini değiştir
    if (window.draggedTabId && window.draggedTabId !== targetTabId) {
        const fromIndex = window.apiTabs.findIndex(t => t.id === window.draggedTabId);
        const toIndex = window.apiTabs.findIndex(t => t.id === targetTabId);

        const element = window.apiTabs.splice(fromIndex, 1)[0];
        window.apiTabs.splice(toIndex, 0, element);

        window.renderApiTabs(); // Yerleri değişmiş yeni diziyi ekrana çiz
    }
};

window.onTabDragEnd = function (e) {
    if (e.target.classList) e.target.classList.remove('dragging');
    document.querySelectorAll('.req-tab').forEach(t => t.classList.remove('drag-over'));
    window.draggedTabId = null;
};

// ==========================================
// HISTORY (GEÇMİŞ) KART OLUŞTURMA VE BASMA
// ==========================================

// Tek bir kayıt için HTML şablonu (Card) üretir
window.createNewHistoryRecord = function (id, method, statusCode, tabName, url) {
    // Metot rengi için mevcut css sınıflarını kullan (method-get, method-post vb.)
    const methodLower = method ? method.toLowerCase() : 'get';

    // Status Code için renk ayrımı (Workspace'deki mantığın aynısı)
    let statusClass = 'status-default';
    const code = parseInt(statusCode);
    if (code >= 200 && code < 300) statusClass = 'status-ok';
    else if (code >= 400) statusClass = 'status-err';
    else if (code >= 300 && code < 400) statusClass = 'status-warn';
    else if (code === 0) statusClass = 'status-err'; // Timeout veya kopukluk

    // Eğer tabName varsa HTML'e ekle, yoksa boş bırak
    const displayTitle = tabName ? `<span class="history-tab-name" title="${tabName}">${tabName}</span>` : '';

    // Yalnızca status code 0'dan büyükse göster, aksi halde 'ERR' yaz
    const displayCode = code > 0 ? code : 'ERR';

    return `
        <div class="history-card" data-id="${id}" onclick="window.loadHistoryToTab(${id})">
            <div class="history-card-header">
                <div class="history-badges">
                    <span class="method-badge method-${methodLower}">${method}</span>
                    <span class="status-badge ${statusClass}" style="font-size: 0.65rem; padding: 2px 6px;">${displayCode}</span>
                </div>
                ${displayTitle}
            </div>
            <div class="history-card-url" title="${url}">
                ${url}
            </div>
            <div class="history-card-footer">
                <button class="history-del-btn" onclick="window.deleteHistoryRecord(event, ${id})" title="Delete from History">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `;
};

// JSON listesini alıp Sidebar'daki History paneline dizer
window.fillHistory = function (historyDataJson) {
    // ARTIK VERİLERİ YENİ OLUŞTURDUĞUMUZ 'history-pane' İÇİNE BASIYORUZ
    const container = document.getElementById('history-pane');
    if (!container) return;

    container.innerHTML = ''; // Önce temizle

    try {
        const data = JSON.parse(historyDataJson);
        if (data.length === 0) {
            container.innerHTML = '<div class="kv-empty-text" style="display:block; margin-top:20px;">No history records found.</div>';
            return;
        }

        let htmlContent = '';
        data.forEach(item => {
            htmlContent += window.createNewHistoryRecord(item.id, item.method, item.status_code, item.tab_name, item.url);
        });

        container.innerHTML = htmlContent;
    } catch (e) {
        console.error("History JSON parse hatası:", e);
    }
};

// Kartın sağ altındaki silme butonuna basılınca çalışır
window.deleteHistoryRecord = function (event, id) {
    event.stopPropagation(); // Karta tıklanma olayını (loadHistory) engeller

    if (confirm("Are you sure you want to delete this history record?")) {


        ajaxRequest(MainForm.MainHTML, 'DeleteHistory', ['id=' + id]);

        const card = document.querySelector(`.history-card[data-id="${id}"]`);
        if (card) {
            card.classList.add('popping');
            setTimeout(() => card.remove(), 250);
        }
    }
};

// Karta tıklandığında çalışır (Verileri Delphi'den çekmek için)
window.loadHistoryToTab = function (id) {
    ajaxRequest(MainForm.MainHTML, 'LoadHistory', ['id=' + id]);
};

// ==========================================
// KART PATLATMA VE SİLME ANİMASYONU
// ==========================================
window.animateAndRemoveCard = function (id) {
    const card = document.querySelector(`.history-card[data-id="${id}"]`);
    if (card) {
        try {
            const popSound = new Audio('files/pop.mp3');
            popSound.volume = 0.6; // Ses seviyesi (%60)
            popSound.play().catch(e => console.log("Ses çalınamadı (Tarayıcı engeli olabilir):", e));
        } catch (err) { }

        // 2. CSS Patlama animasyonunu başlat
        card.classList.add('popping');

        // 3. Animasyon bittikten sonra (250ms) elementi DOM'dan tamamen temizle
        setTimeout(() => card.remove(), 250);
    }
};

// ==========================================
// SOL MENÜ SEKME DEĞİŞTİRME MANTIĞI
// ==========================================
window.switchSidebar = function (tabName, event) {
    // 1. Üstteki sekme başlıklarının aktifliğini (renklerini) değiştir
    const tabs = document.querySelectorAll('.sidebar-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (event) {
        event.currentTarget.classList.add('active');
    }

    // 2. Tıklanan sekmeye göre ilgili paneli göster, diğerini gizle
    const historyPane = document.getElementById('history-pane');
    const collectionsPane = document.getElementById('collections-pane');

    if (historyPane && collectionsPane) {
        historyPane.style.display = (tabName === 'history') ? 'block' : 'none';
        collectionsPane.style.display = (tabName === 'collections') ? 'block' : 'none';
    }
};

// ==========================================
// GEÇMİŞ KAYDINI YENİ SEKMEYE YÜKLEME
// ==========================================
window.loadHistoryIntoTab = function (historyDataJson) {
    try {
        const data = JSON.parse(historyDataJson);

        // 1. Önce tertemiz yeni bir sekme oluştur
        window.addNewApiTab();

        // 2. Yeni sekme otomatik olarak aktif sekme (activeTabId) oldu, onu bul
        const tab = window.apiTabs.find(t => t.id === window.activeTabId);
        if (!tab) return;

        // 3. Veritabanından gelen verileri sekmeye aktar
        tab.customName = data.tab_name || '';
        tab.method = data.method || 'GET';
        tab.url = data.url || '';
        tab.bodyType = data.body_type || 'none';
        tab.rawType = data.raw_type || 'application/json';
        tab.reqBody = data.req_body || '';

        // 4. Grid (Params, Headers, Urlencoded) verilerini parse et
        try { tab.reqParams = data.req_params ? JSON.parse(data.req_params) : []; } catch (e) { tab.reqParams = []; }
        try { tab.reqHeaders = data.req_headers ? JSON.parse(data.req_headers) : []; } catch (e) { tab.reqHeaders = []; }
        try { tab.reqUrlencoded = data.req_urlencoded ? JSON.parse(data.req_urlencoded) : []; } catch (e) { tab.reqUrlencoded = []; }

        // 5. Yanıt (Response) kısımlarını sıfırla (Geçmişten sadece atılan istek geri yüklenir)
        tab.resBody = '';
        tab.resStatus = '000 WAITING';
        tab.resStatusClass = 'status-badge status-default';
        tab.resTime = '0 ms';
        tab.resSize = '0 B';

        // =====================================
        // ÇÖZÜM NOKTASI
        // =====================================
        // UI'daki boş verilerin hafızadaki verilerimizi ezmesini engellemek için
        // aktif sekme ID'sini geçici olarak null yapıyoruz.
        window.activeTabId = null;

        // 6. Güncellenmiş sekme verilerini arayüze (UI) bas
        window.switchApiTab(tab.id);

    } catch (e) {
        if (window.iposiAlert) window.iposiAlert('Load Error', 'An error occurred while reading the history record.', 'error');
        console.error("History record parse error:", e);
    }
};