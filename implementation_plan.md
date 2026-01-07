# Implementation Plan - PDF Scanner & Data Extractor

## 1. Project Setup & Architecture
- [x] Create directory structure (`css/`, `js/`, `assets/`).
- [x] Create `index.html` (Landing Page).
- [x] Create `auth.html` (Sign In / Sign Up).
- [x] Create `dashboard.html` (Main Application).
- [x] Create `css/style.css` (Global Styles - Premium Aesthetic).

## 2. Authentication (Mock)
- [x] Implement `js/auth.js`.
- [x] Handle Sign Up (Save to LocalStorage).
- [x] Handle Sign In (Validate against LocalStorage).
- [x] Redirect to Dashboard upon success.

## 3. Dashboard UI
- [x] Design a Split-View Layout.
    - **Left Panel**: Extracted Data (Customer Details).
    - **Right Panel**: PDF Viewer.
- [x] Add File Upload Area (Drag & Drop).

## 4. PDF Processing & Extraction Logic
- [x] Integrate `pdf.js` via CDN.
- [x] Implement PDF Rendering in the Right Panel.
- [x] Implement Text Extraction logic.
    - [x] `js/dashboard.js`: Extract text content from PDF.
    - [x] Regex Parsers (Context-Aware for Customer details).
- [x] Populate Left Panel with extracted data.

## 5. History & Export (New)
- [ ] **History Table**:
    - [ ] Create a table in `dashboard.html` to show past scans.
    - [ ] Store scan data in `localStorage`.
- [ ] **Export Functionality**:
    - [ ] Export to Excel (using `SheetJS`).
    - [ ] Export to PDF (using `jsPDF`).

## 6. Polish & Verification
- [ ] Verify Mobile Number extraction.
- [ ] Verify Pincode extraction.
- [ ] Verify State extraction.
- [ ] Verify Amount extraction.
- [ ] Ensure "Left Side" requirement is met.
- [ ] UX Polish (Animations, Transitions).
