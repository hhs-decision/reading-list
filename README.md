# 📚 Reading List

A modern, interactive reading list manager for research papers — hosted as a static site on GitHub Pages.

## Features

- ✅ **Checkbox** — mark papers as read/unread
- 🔴🟡🟢 **Priority** — red (high), yellow (medium), green (low); click dot to cycle
- 🏷️ **Category labels** — auto-populated from your data
- 🔍 **Filter & Search** — filter by priority chip, category dropdown, completion status, or free text
- 📄 **PDF links** — open local PDFs stored in the `pdfs/` folder
- 🔗 **URL links** — jump to the publication/arXiv page
- ➕ **Add / Edit / Delete** — full CRUD via modal
- 📊 **Progress bar** — visual completion tracker
- 💾 **Persisted** — changes saved to `localStorage`

---

## Folder Structure

```
reading-list/
├── index.html              ← main app
├── css/
│   └── style.css
├── js/
│   └── app.js
├── data/
│   └── reading-list.json   ← seed data (loaded once on first visit)
├── pdfs/
│   └── your-paper.pdf      ← drop your PDFs here
└── README.md
```

---

## How to Add Papers

### Option A — In the browser
Click **Add Paper** and fill in the form. Changes persist in `localStorage`.

### Option B — Edit the JSON seed file
Edit `data/reading-list.json` before the first visit (or clear `localStorage` to reload it).

```json
{
  "id": 7,
  "title": "My New Paper",
  "authors": "Smith et al.",
  "year": 2024,
  "category": "NLP",
  "priority": "red",
  "completed": false,
  "pdf": "pdfs/my-new-paper.pdf",
  "url": "https://arxiv.org/abs/xxxx.xxxxx",
  "notes": "Optional notes here"
}
```

> **Priority values:** `"red"` = high, `"yellow"` = medium, `"green"` = low

---

## Uploading to GitHub

### 1. Create a new GitHub repository

Go to https://github.com/new and create a repo (e.g. `reading-list`).  
Make it **Public** if you want GitHub Pages to work on the free plan.

### 2. Push the files

```bash
# In your terminal, navigate to this folder
cd reading-list

# Initialize git
git init
git add .
git commit -m "Initial reading list"

# Add your GitHub remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push
git branch -M main
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repo on GitHub
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Source**, select **Deploy from a branch**
4. Choose branch: `main`, folder: `/ (root)`
5. Click **Save**

Your site will be live at:
```
https://YOUR_USERNAME.github.io/REPO_NAME/
```
(takes ~1 minute to deploy)

---

## Adding PDFs

Place your PDF files in the `pdfs/` folder:

```
pdfs/
├── attention-is-all-you-need.pdf
├── bert.pdf
└── alexnet.pdf
```

Then set the `pdf` field in your paper entry to `pdfs/filename.pdf`.  
GitHub has a **100 MB per file limit** — for large PDFs, consider linking to Google Drive or a CDN instead.

---

## Tips

- **Clearing seed data reset**: Open browser DevTools → Application → Local Storage → delete the `reading-list-v1` key to reload from `data/reading-list.json`
- **Sorting**: Click any column header to sort; click again to reverse
- **Mobile**: Category, year, and notes columns are hidden on small screens for readability
