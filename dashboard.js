// Check Auth
const currentUser = localStorage.getItem('currentUser');
let userObj = null;

if (!currentUser) {
    window.location.href = 'auth.html';
} else {
    userObj = JSON.parse(currentUser);
    document.getElementById('user-info').innerText = `Logged in as ${userObj.name || userObj.email}`;
}

// User Specific History Key
const HISTORY_KEY = 'scanHistory_' + userObj.email;

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
});

window.resetUpload = function () {
    document.getElementById('upload-area').classList.remove('hidden');
    document.getElementById('viewer-area').classList.add('hidden');
    document.getElementById('file-input').value = '';
};

// Drag and Drop
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const viewerArea = document.getElementById('viewer-area');
const pdfCanvas = document.getElementById('pdf-render');
const canvasContext = pdfCanvas.getContext('2d');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => uploadArea.classList.add('dragover'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('dragover'), false);
});

uploadArea.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', (e) => handleFiles(e.target.files), false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (files.length > 0) {
        uploadArea.classList.add('hidden');
        viewerArea.classList.remove('hidden');

        Array.from(files).forEach((file, index) => {
            if (file.type === 'application/pdf') {
                processFile(file, index === 0);
            }
        });
    }
}

function processFile(file, shouldRender) {
    const fileReader = new FileReader();
    fileReader.onload = function () {
        const typedarray = new Uint8Array(this.result);
        pdfjsLib.getDocument(typedarray).promise.then(pdf => {
            pdf.getPage(1).then(page => {
                if (shouldRender) {
                    renderPage(page);
                }
                extractData(page);
            });
        });
    };
    fileReader.readAsArrayBuffer(file);
}

function renderPage(page) {
    const viewport = page.getViewport({ scale: 1.5 });
    pdfCanvas.height = viewport.height;
    pdfCanvas.width = viewport.width;
    const renderContext = {
        canvasContext: canvasContext,
        viewport: viewport
    };
    page.render(renderContext);
}

async function extractData(page) {
    const textContent = await page.getTextContent();
    const sortedItems = textContent.items.sort((a, b) => b.transform[5] - a.transform[5]);
    const textItems = sortedItems.map(item => item.str);
    const fullText = textItems.join(' ');

    // Parsing Logic
    const customerSegment = getCustomerSegment(fullText);
    const textToSearch = customerSegment || fullText;

    // 1. Find State first (Anchor)
    const state = findState(textToSearch);

    // 2. Find Mobile
    const mobile = findMobile(textToSearch);

    // 3. Find Pincode (3-Step Robust Logic)
    const pincode = findPincode(textToSearch, state);

    const amount = findAmount(fullText);

    // Update UI (Sidebar)
    document.getElementById('res-mobile').value = mobile || "Not Found";
    document.getElementById('res-pincode').value = pincode || "Not Found";
    document.getElementById('res-state').value = state || "Not Found";
    document.getElementById('res-amount').value = amount || "Not Found";

    document.getElementById('results-container').style.opacity = '1';
    document.getElementById('results-container').style.pointerEvents = 'all';

    saveToHistory({
        date: new Date().toLocaleString(),
        mobile: mobile || "N/A",
        state: state || "N/A",
        pincode: pincode || "N/A",
        amount: amount || "0"
    });
}

// Extraction Helpers
function getCustomerSegment(text) {
    const lowerText = text.toLowerCase();
    const keywords = ["recipient address", "ship to", "bill to", "consignee", "delivery address", "buyer", "customer"];
    let bestIndex = -1;
    for (const kw of keywords) {
        const idx = lowerText.indexOf(kw);
        if (idx !== -1) {
            if (bestIndex === -1 || idx > bestIndex) {
                bestIndex = idx;
            }
        }
    }
    if (bestIndex !== -1) return text.substring(bestIndex);
    return null;
}

function findMobile(text) {
    const labelRegex = /(?:Mobile|Mob|Phone|Cel|Contact)(?:\s+No\.?|l)?[\s.:-]*([0-9]{10,})/i;
    const labelMatch = text.match(labelRegex);
    if (labelMatch) return labelMatch[1];

    const mobileRegex = /\b[6-9]\d{9}\b/g;
    const matches = text.match(mobileRegex);
    if (matches) return matches[0];
    return null;
}

function findPincode(text, nearbyStateIdentifier) {

    // Priority 1: Explicit Label "Pin:" or "Pincode:"
    const labelRegex = /(?:Pin|Pin\s*Code|Pincode)(?:\s*[:.-])?\s*(\d{6})\b/i;
    const labelMatch = text.match(labelRegex);
    if (labelMatch) return labelMatch[1];

    // Priority 2: Next to State
    if (nearbyStateIdentifier) {
        // Normalize state name for regex: replace spaces with \s+ to match single/multiple spaces or newlines
        // This fixes "Uttar Pradesh" matching "Uttar   Pradesh" or "Uttar\nPradesh"
        const paramState = nearbyStateIdentifier.trim();

        let safeStateRegexStr;
        if (paramState === "Uttar Pradesh") {
            // Special handling: Match "Uttar Pradesh", "UttarPradesh", "U.P."
            safeStateRegexStr = "(?:Uttar\\s*Pradesh|UttarPradesh|U\\.?P\\.?)";
        } else {
            safeStateRegexStr = paramState.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
        }

        // Search for State followed by Pincode (Forward)
        const statePinRegex = new RegExp(`${safeStateRegexStr}[\\s\\S]{0,60}?(\\d{6})\\b`, 'i');
        const match = text.match(statePinRegex);
        if (match) return match[1];

        // Search for Pincode followed by State (Reverse) - e.g. "201301 Uttar Pradesh"
        const pinStateRegex = new RegExp(`(\\d{6})[\\s\\S]{0,30}?${safeStateRegexStr}`, 'i');
        const revMatch = text.match(pinStateRegex);
        if (revMatch) return revMatch[1];
    }

    // Priority 3: The LAST 6-digit number in the segment
    const pinRegex = /\b\d{6}\b/g;
    const matches = text.match(pinRegex);
    if (matches) return matches[matches.length - 1];

    return null;
}

function findState(text) {
    const supplyRegex = /(?:Place Of Supply|State Code)[\s.:-]*([A-Z]{2,})/i;
    const supplyMatch = text.match(supplyRegex);
    if (supplyMatch) {
        const extracted = supplyMatch[1].toUpperCase().trim();
        const stateMap = {
            "KAR": "Karnataka", "GUJ": "Gujarat", "MAH": "Maharashtra", "DEL": "Delhi",
            "RAJ": "Rajasthan", "UP": "Uttar Pradesh", "TN": "Tamil Nadu", "MP": "Madhya Pradesh",
            "AP": "Andhra Pradesh", "WB": "West Bengal", "TEL": "Telangana"
        };
        if (stateMap[extracted]) return stateMap[extracted];
        if (extracted.length <= 3) return extracted;
    }

    const states = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
        "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
        "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
        "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
        "West Bengal", "Delhi", "Chandigarh", "Jammu and Kashmir", "Ladakh", "Puducherry"
    ];

    let foundStates = [];
    const lowerText = text.toLowerCase();
    for (const state of states) {
        if (lowerText.includes(state.toLowerCase())) foundStates.push(state);
    }
    if (foundStates.length > 0) return foundStates[foundStates.length - 1];
    return null;
}

function findAmount(text) {
    const grandTotalRegex = /(?:Grand Total|Invoice Value|Inv Value|Total Amount)[\s:₹Rs.]*([\d,]+\.?\d*)/i;
    const totalRegex = /Total[\s:₹Rs.]*([\d,]+\.?\d*)/i;
    const cleanRaw = (raw) => {
        if (!raw) return null;
        const num = raw.replace(/[^\d.]/g, '');
        return parseFloat(num) ? num : null;
    };
    let match = text.match(grandTotalRegex);
    if (match) return cleanRaw(match[1]);
    match = text.match(totalRegex);
    if (match) return cleanRaw(match[1]);
    return null;
}

// History & Export
const historyTableBody = document.getElementById('history-table-body');
const emptyHistoryMsg = document.getElementById('empty-history');

// Load history specifically for this user
let scanHistory = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];

function renderHistory() {
    if (!historyTableBody) return;
    historyTableBody.innerHTML = '';
    if (scanHistory.length === 0) {
        emptyHistoryMsg.style.display = 'block';
    } else {
        emptyHistoryMsg.style.display = 'none';
        scanHistory.slice().reverse().forEach((scan, index) => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            row.innerHTML = `
                <td style="padding: 1rem;">${scan.date}</td>
                <td style="padding: 1rem;">${scan.mobile}</td>
                <td style="padding: 1rem;">${scan.state}</td>
                <td style="padding: 1rem;">${scan.pincode}</td>
                <td style="padding: 1rem;">₹${scan.amount}</td>
                <td style="padding: 1rem;">
                    <button onclick="deleteHistoryItem(${scanHistory.length - 1 - index})" class="btn" style="color: #ef4444; padding: 0.2rem 0.5rem; font-size: 0.8rem;">Delete</button>
                </td>
            `;
            historyTableBody.appendChild(row);
        });
    }
}

function saveToHistory(data) {
    scanHistory.push(data);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(scanHistory));
    renderHistory();
}

window.deleteHistoryItem = function (index) {
    if (confirm('Delete this record?')) {
        scanHistory.splice(index, 1);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(scanHistory));
        renderHistory();
    }
};

window.exportExcel = function () {
    if (scanHistory.length === 0) {
        alert("No data to export!");
        return;
    }
    const ws = XLSX.utils.json_to_sheet(scanHistory);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Scans");
    XLSX.writeFile(wb, "ScanHistory.xlsx");
};

window.exportPDF = function () {
    if (scanHistory.length === 0) {
        alert("No data to export!");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Scan History Report", 14, 20);
    const tableColumn = ["Date", "Mobile", "State", "Pincode", "Amount"];
    const tableRows = [];
    scanHistory.forEach(scan => {
        tableRows.push([scan.date, scan.mobile, scan.state, scan.pincode, scan.amount]);
    });
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 30 });
    doc.save("ScanHistory.pdf");
};

renderHistory();
