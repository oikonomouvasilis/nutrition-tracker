# 🥗 Nutrition Tracker

Προσωπική εφαρμογή παρακολούθησης διατροφής: αποθήκευση μακροθρεπτικών τροφών,
σύνθεση γευμάτων από συστατικά, αυτόματος υπολογισμός θερμίδων & μακροθρεπτικών,
ιστορικό γευμάτων και στατιστικά πρόσληψης.

> Personal nutrition tracking app — store food macros, compose meals from
> ingredients, auto-calculate calories & macros, keep a meal history, and
> visualize intake statistics.

---

## ✨ Τι κάνει (όραμα)

- **Βάση τροφών** — αποθήκευση τροφών με μακροθρεπτικά ανά 100g (πρωτεΐνη,
  υδατάνθρακες, λιπαρά, θερμίδες, και προαιρετικά: φυτικές ίνες, ζάχαρη, νάτριο).
- **Σύνθεση γευμάτων** — συνδυασμός συστατικών σε ποσότητες για τη δημιουργία ενός
  γεύματος.
- **Αυτόματος υπολογισμός** — συνολική θερμιδική & μακροθρεπτική αξία κάθε γεύματος.
- **Ιστορικό** — καταγραφή όλων των γευμάτων ανά ημέρα.
- **Στατιστικά** — οπτικοποίηση της ημερήσιας/εβδομαδιαίας πρόσληψης (θερμίδες,
  κατανομή μακροθρεπτικών, τάσεις στον χρόνο).

## 🧱 Τεχνολογική στοίβα

| Layer         | Επιλογή                                  |
|---------------|------------------------------------------|
| Framework     | **Next.js 16** (App Router) + React 19   |
| Γλώσσα        | **TypeScript**                           |
| Styling       | **Tailwind CSS v4**                      |
| Lint          | ESLint (`eslint-config-next`)            |
| Βάση δεδομένων | _(TBD — π.χ. SQLite + Prisma)_          |
| Γραφήματα     | _(TBD — π.χ. Recharts)_                  |
| Deployment    | _(TBD — π.χ. Vercel)_                    |

> ⚠️ Αυτή η έκδοση του Next.js (16) έχει breaking changes σε σχέση με
> παλιότερες. Δες το `AGENTS.md` και τα docs στο `node_modules/next/dist/docs/`
> πριν γράψεις κώδικα.

## 🚀 Εκτέλεση τοπικά

```bash
npm install      # εγκατάσταση dependencies
npm run dev      # development server → http://localhost:3000
npm run build    # production build
npm run start    # εκτέλεση production build
npm run lint     # έλεγχος κώδικα
```

## 🗂️ Δομή

```
src/
  app/            # Next.js App Router (pages, layouts)
public/           # static assets
reference/        # 🔒 προσωπικά δεδομένα reference (gitignored — ΔΕΝ ανεβαίνει)
```

## 🔒 Ιδιωτικότητα

Το repo είναι **public**. Πραγματικά προσωπικά δεδομένα διατροφής/υγείας **δεν**
ανεβαίνουν: ο φάκελος `reference/` και τα αρχεία Excel (`*.xlsm/*.xlsb/*.xlsx`)
αγνοούνται μέσω `.gitignore`. Το αρχικό Excel υπολογισμού θερμίδων κρατείται
τοπικά εκεί, ως πηγή για τη βάση τροφών.

## 🗺️ Roadmap

- [x] **Φάση 0 — Setup:** GitHub repo, Next.js + TypeScript scaffold.
- [ ] **Φάση 1 — Data model:** σχεδίαση οντοτήτων (Food, Meal, MealItem, LogEntry),
      επιλογή βάσης (SQLite + Prisma), seeds από το reference Excel.
- [ ] **Φάση 2 — Βάση τροφών:** CRUD τροφών με μακροθρεπτικά ανά 100g.
- [ ] **Φάση 3 — Σύνθεση γευμάτων:** meal builder + αυτόματος υπολογισμός.
- [ ] **Φάση 4 — Ιστορικό:** ημερήσιο log γευμάτων.
- [ ] **Φάση 5 — Στατιστικά:** dashboards & γραφήματα πρόσληψης.

## 📄 Άδεια

Προσωπικό project — δεν έχει οριστεί άδεια ακόμα.
